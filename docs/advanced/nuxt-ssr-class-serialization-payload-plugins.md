# Nuxt SSR 中的类序列化 {#nuxt-ssr-class-serialization-payload-plugins}


在 Vue / Nuxt 里用「类（class）」来承载状态并不常见，但确实会遇到可能是出于个人偏好，也可能是某个库直接返回了类实例（比如日期、货币、几何图形、Firebase Document reference 等封装对象）。

一旦这些类实例进入 **服务端渲染（Server-Side Rendering，SSR）** 的状态流转，就会踩到一个坑。

问题的核心在于 **payload 序列化**。

SSR 时，服务端把状态序列化进页面 payload，客户端再据此还原（hydrate）。

而序列化默认只认识**普通对象（Plain Old JavaScript Object，POJO）**、数组、字符串等基础结构。

当状态里塞进一个类实例时，Nuxt 会抛出那句让人头疼的警告，大意是「不能把非 POJO 序列化到 payload」，因为类的原型（prototype）、方法都无法被简单地 JSON 化并原样带回客户端。

## 恼人的报错从何而来：序列化与 POJO {#serialization-and-pojo}

先理解「序列化」在 SSR 里的角色。服务端算出状态后，需要把它转成能嵌进 HTML 的文本（payload），随页面下发给浏览器；客户端启动时再把这段文本「复活」成 JavaScript 数据结构，从而避免重复计算、保证两端一致。

关键限制是：**默认的序列化只保留数据本身，不保留「类型信息」。** 一个类实例经过普通序列化后：

- 它的 **方法（method）** 会丢失；
- 它的 **原型链（prototype chain）** 会断裂；
- 客户端拿回来的只是一个「长得像它、但不再是它」的普通对象。

因此 Nuxt 干脆在检测到非 POJO 时给出警告，提醒你：这样的数据无法被完整还原成原来的类实例。

一个会触发问题的类（后文示例统一使用它，并抽到共享文件中，方便服务端和客户端都能引用）：

::: code-group
```ts [app/app.vue]
<script setup lang="ts">
// 把类实例放进 SSR 状态
import { BlogPost } from '~/utils/BlogPost'

const post = useState('post', () => new BlogPost('Hello Nuxt', new Date()))
</script>

<template>
<h1>{{ post.summary }}</h1>
</template>
```

```ts [app/utils/BlogPost.ts]
export class BlogPost {
  constructor(public title: string, public createdAt: Date) {}

  get summary() {
    return `${this.title} (${this.createdAt.toISOString()})`
  }
}
```
:::

SSR 序列化 `post` 时，`BlogPost` 的 `summary` getter 和原型都无法被带到客户端，于是报错出现。

```text
500
Server Error
Cannot stringify arbitrary non-POJOs
```

## 解决方案：Payload 的 reducer 与 reviver {#payload-reducer-and-reviver}

Nuxt 提供了一套**可扩展的 payload 序列化机制**，允许开发者为任意类型注册「如何压缩（reduce）」和「如何还原（revive）」的逻辑。这一对函数就是：

- `definePayloadReducer`：在**服务端**运行，负责把某个特殊类型「降维」成可序列化的数据；
- `definePayloadReviver`：在**客户端**运行，负责把降维后的数据「复活」回原来的类型。

### 用 definePayloadPlugin 注册（否则会报 Unknown type）{#register-definePayloadPlugin}

这是最容易被忽略、也最致命的一步。如果把上述两个函数简单地放进普通的 `defineNuxtPlugin` 里，客户端启动时会抛出如下错误链：

```text
Error: Unknown type BlogPost
    at hydrate (parse.js:218:13)
    ...
    at parsePayload (payload.js:164:16)
    at getNuxtClientPayload (payload.js:151:28)
```

随后还会连锁引发一堆次生报错：`Invalid vnode type ... undefined`、`Hydration node mismatch`、`Hydration completed but contains mismatches`，甚至 `Cannot read properties of undefined (reading 'beforeEach')`。**这些都不是独立的 bug，而是「payload 解析失败导致 app 初始化中断」的连锁反应。**

根因在于**注册时机**：Nuxt 解析客户端 payload 发生在应用初始化的**极早期**，比普通 `defineNuxtPlugin` 的执行还早。等普通插件里的 `definePayloadReviver` 运行时，payload 早就已经解析（并失败）了，所以客户端找不到 `BlogPost` 的 reviver，抛出 `Unknown type BlogPost`。

正确入口是 **`definePayloadPlugin`**，它保证内部注册的 reducer / reviver 在 payload 被处理**之前**就绪。

**服务端 reducer 插件：**

```ts
// plugins/blog-post.server.ts
import { BlogPost } from '~/utils/BlogPost'

export default definePayloadPlugin(() => {
  definePayloadReducer('BlogPost', (data) => {
    // 仅当是 BlogPost 实例时返回可序列化数据，否则返回 falsy
    return data instanceof BlogPost && {
      title: data.title,
      createdAt: data.createdAt.toISOString()
    }
  })
})
```

**客户端 reviver 插件：**

```ts
// plugins/blog-post.client.ts
import { BlogPost } from '~/utils/BlogPost'

export default definePayloadPlugin(() => {
  definePayloadReviver('BlogPost', (data) => {
    // 把降维后的数据还原成真正的类实例
    return new BlogPost(data.title, new Date(data.createdAt))
  })
})
```

配对要点：

- **外层必须用 `definePayloadPlugin` 而非 `defineNuxtPlugin`**，否则 reviver 注册太晚，直接 `Unknown type`；
- reducer 与 reviver 的**第一个参数（类型名）必须逐字一致**（这里都是 `'BlogPost'`，大小写不同也会失败）；
- reducer 应只在**确实是目标类型时**才返回数据（用 `instanceof` 判定），其它情况返回假值，让别的 reducer 处理；
- reducer（`.server`）与 reviver（`.client`）**必须成对存在**，只写一端同样会 `Unknown type`。

这样处理后，客户端拿回的 `post` 又是一个真正的 `BlogPost` 实例，`summary` getter 也能正常工作，POJO 警告以及上面那整条错误链都会一并消失。

## 手动检查 payload

要验证序列化是否正确，可以直接查看页面 payload。Nuxt 会把状态写入页面中的 payload 数据，通过浏览器「查看网页源代码」或 DevTools 就能看到序列化后的结构，从而确认：

- 目标类型是否被正确降维（应看到 `BlogPost` 变成带类型标记的 `{ title, createdAt }`）；
- 客户端是否按预期还原；
- 是否还有遗漏的非 POJO 数据在触发警告。

这一步对于排查「明明注册了插件却还报错」的问题尤其有用，往往是类型名不匹配、漏了某一端，或用错了 `defineNuxtPlugin`。

## 常见案例：让类在 SSR 中可用的步骤 {#common-steps-for-ssr-class}

1. 确认报错来源：状态里是否放入了类实例或其它非 POJO 数据。
2. 先查 Nuxt 内置 reviver 列表，确认该类型是否已被原生支持。
3. 把类定义抽到共享文件（如 `utils/BlogPost.ts`），供两端引用。
4. 新建 `.server` 插件，用 **`definePayloadPlugin`** 包裹 `definePayloadReducer`。
5. 新建 `.client` 插件，用 **`definePayloadPlugin`** 包裹 `definePayloadReviver`。
6. 保证 reducer 与 reviver 的类型名**逐字一致**，且两端成对存在。
7. reducer 内做 `instanceof` 判定，只处理目标类型。
8. 通过查看页面 payload 验证降维与还原是否正确。

## 注意事项 {#caution}

| 事项                            | 说明                                                                |
|-------------------------------|-------------------------------------------------------------------|
| 默认序列化不保留类型                    | 类实例经普通序列化后会丢方法、断原型，变成 POJO                                        |
| **必须用 `definePayloadPlugin`** | 用 `defineNuxtPlugin` 注册会太晚，导致 `Unknown type XXX` 及连锁 hydration 报错 |
| reducer 在服务端、reviver 在客户端     | 分别放在 `.server` 与 `.client` 插件里                                    |
| 类型名必须逐字一致且成对                  | Nuxt 靠这个名字匹配；缺一端或大小写不符都会 `Unknown type`                           |
| reducer 要做类型判定                | 用 `instanceof` 精确命中，非目标类型返回假值                                     |
| `Unknown type` 是连锁源头          | 后续 vnode undefined、hydration mismatch、`beforeEach` 报错都源于此         |
| 优先用内置支持                       | Nuxt / devalue 已支持 `Date`、`Map`、`Set` 等，别重复实现                     |
| 敏感信息勿入 payload                | payload 客户端可见，密钥、令牌等不应通过状态传输                                      |
| 库提供的类同样适用                     | 第三方类无法改源码时，同样可用 reducer/reviver 适配                                |

把类放进 SSR 状态并不是禁区，关键是理解「序列化会抹掉类型」这一前提，用 `definePayloadReducer` / `definePayloadReviver` 这对工具显式告诉 Nuxt「如何把它降维、又如何把它复活」，并**务必用 `definePayloadPlugin` 注册**以保证时机正确。