# Nitro 里为什么没有 composables 文件夹 {#no-composables-folder-in-nitro}

如果从 Vue / Nuxt 前端转向 Nitro 服务端开发，大概率会产生一个疑问：Nitro 里随处可见 `useStorage`、`useRuntimeConfig` 这类带 `use` 前缀的函数。

按前端的习惯它们应该放在 `composables/` 文件夹里、只在顶层调用，但 Nitro 既没有这个文件夹，也没有"顶层调用"的约束。

要回答这个问题，需要理清一个核心概念：**上下文（context）**。

前端的 composable 依赖 Vue 的组件生命周期上下文，而 Nitro 的 `use*` 函数依赖的是请求事件上下文（request event context），两者机制完全不同。

理解这一差异，不仅能解释文件夹的有无，也能避免在前端把 `useFetch` 写进 `onClick` 这类常见错误。

## 前端 composable 依赖 Vue 上下文 {#frontend-composable-and-vue-context}

在 Vue / Nuxt 中，composable 是一种"设置一次、持续可用"的函数。

它在组件的 `<script setup></script>` 块（或另一个仅在此处执行的 composable）中被调用，Vue 负责其搭建（setup）与销毁（teardown），并管理其中的响应式（reactivity）。

关键在于：composable 必须在 **Vue 上下文** 存在时调用。

所谓 Vue 上下文，是指组件正在搭建、框架仍在掌控代码执行的阶段。

一旦离开了这个阶段，例如在按钮的 `onClick` 回调中——就退回到了纯浏览器上下文（browser context），框架不再介入。

一个常见的反例：

```vue
<script setup>
const data = ref(null)
</script>

<template>
  <button @click="() => {
    // 错误：useFetch 不能写在 onClick 里
    const { data } = useFetch('/api/users')
  }">click me</button>
</template>
```

`useFetch` 是 composable，必须在顶层调用，在 `onClick` 里调用时 Vue 上下文已不存在，响应式和生命周期管理都会失效。

表单提交等事件回调中应改用 `$fetch` 或其他与响应式无关的请求库。

正确写法：

```vue
<script setup>
// 顶层调用，在 Vue 上下文中
const { data, refresh } = useFetch('/api/users')
</script>

<template>
  <button @click="refresh">click me</button>
</template>
```

## Nitro 中函数的上下文归属 {#function-context-in-nitro}

在 `defineEventHandler` 内部，代码天然处于 Nitro 上下文。

但一旦写到外部，比如一个独立的工具函数——就脱离了框架上下文，无法直接访问 `event`。

**显式传参方式**：把 `event` 作为参数传入，让函数重新获得上下文。

```ts
// utils/user.ts
import type { H3Event } from 'h3'

function checkPermission(event: H3Event, permissionString: string) {
  const user = event.context.user
  // 基于 user 和 permissionString 做校验
}
```

调用处：

```ts
export default defineEventHandler(async (event) => {
  checkPermission(event, 'users:edit')
  // ...
})
```

这种方式是**显式的**——必须手动传递 `event`，调用链上每个需要上下文的函数都要接收它作为参数。

**隐式上下文方式**：Nitro 提供了实验性的 `useEvent` 函数，可以隐式获取当前请求事件，无需传参。

```ts
const event = useEvent()
```

这种方式更接近前端 composable 的风格——不必在每个函数间传递 `event`。

但它目前是实验性的，且受限于 **AsyncLocalStorage（ALS）上下文**：一旦遇到异步操作，上下文可能丢失。

## useRuntimeConfig：同名不同实现 {#use-runtime-config}

`useRuntimeConfig` 是一个典型案例：前后端都叫这个名字，行为目的相似（访问运行时配置），但底层实现完全不同。

| 维度       | 前端（client/SSR）                 | 服务端（Nitro）      |
|------------|------------------------------------|----------------------|
| 数据来源   | 全局对象中的 public runtime config | 环境变量解析         |
| 私有配置   | 不可访问                           | 可访问（仅在服务端） |
| 上下文依赖 | Vue 上下文                         | Nitro 上下文         |

这种"同名不同实现"带来困惑：改名字区分前后端也不合适，因为它们做的事确实一样——只是底层机制不同。这是一个正在被讨论和改进的设计难题。

## 为什么没有 composables 文件夹 {#why-no-composables-folder}

综合以上分析，原因可以归结为：

1. **第一，没有"上下文隔离"的需求。** 

    前端的 `composables/` 文件夹存在的意义之一，是标记"这些函数必须在 Vue 上下文中、在顶层调用"。

    Nitro 服务端不存在这种"组件搭建期 vs 事件回调期"的二元划分，`defineEventHandler` 内部就是唯一的主上下文，写在 `utils/` 里的函数最终都会在事件处理器中被调用，天然处于 Nitro 上下文中。

2. **第二，"顶层"的参照物不存在。** 

    前端 composable 的"顶层"指的是 `<script setup>` 的顶层。

    Nitro 没有单文件组件（SFC），没有 `setup` 钩子，"顶层"这个概念没有对应物。

    所有 `use*` 函数最终都是在某个事件处理器的执行流中被调用的，无所谓"顶层不顶层"。

3. **第三，混在一起反而更灵活。** 

    正因为没有上下文隔离的硬边界，`utils/` 文件夹里可以自由混放带上下文依赖的函数（`useStorage`、`useRuntimeConfig`）和纯工具函数（格式化文本等），按需调用即可。

    如果强行拆出一个 `composables/` 文件夹，反而增加了无意义的认知负担。

> `utils/` 中那些不依赖任何上下文的纯函数（如文本格式化工具）确实可以在任何地方调用，而依赖上下文的函数则需要在 Nitro 上下文中使用——但这种区分通过函数签名（是否需要 `event` 参数）就能体现，不需要额外的文件夹约定。

## 在 Nitro 中正确使用上下文相关函数 {#common-cases}

- **步骤一：在事件处理器内部直接调用 `use*` 函数**

    ```ts
    // server/api/users.get.ts
    export default defineEventHandler(async (event) => {
      const storage = useStorage()           // Nitro 上下文，直接可用
      const config = useRuntimeConfig()      // 同上
      const users = await storage.getItem('users')
      return users
    })
    ```

- **步骤二：把需要 `event` 的逻辑抽成独立函数，显式传参**

    ```ts
    // utils/auth.ts
    import type { H3Event } from 'h3'

    export function checkPermission(event: H3Event, permission: string) {
      const user = event.context.user
      if (!user) {
        throw createError({ statusCode: 403, statusMessage: 'not allowed' })
      }
      // 校验逻辑...
    }
    ```

    ```ts
    // server/api/users/edit.put.ts
    export default defineEventHandler(async (event) => {
      checkPermission(event, 'users:edit')
      // 业务逻辑...
    })
    ```

- **步骤三：把"获取用户 + 校验权限"封装成包装事件处理器**

    结合上一篇视频中的 Wrapped Event Handler 模式，可以进一步消除重复：

    ```ts
    // utils/auth.ts
    export function defineEventHandlerWithCheckUser(
      permission: string,
      handler: (event: H3Event, user: User) => Promise<any>
    ) {
      return defineEventHandler(async (event) => {
        const user = await getCurrentUser(event)
        checkPermission(event, permission)
        return handler(event, user)
      })
    }
    ```

    ```ts
    // server/api/users/edit.put.ts
    export default defineEventHandlerWithCheckUser('users:edit', async (event, user) => {
      // 只剩业务逻辑
      return { success: true }
    })
    ```

- **步骤四：如需隐式获取 event，谨慎使用实验性 `useEvent`**

    ```ts
    // 实验性 API，受 ALS 限制，异步操作后可能丢失上下文
    const event = useEvent()
    ```

    仅在同步调用链或确信 ALS 上下文完整时使用，不要在生产关键路径上依赖它。

- **步骤五：前端 composable 严格限制在顶层调用**

    ```vue
    <script setup>
    // 正确：顶层调用
    const { data, refresh } = useFetch('/api/users')
    </script>

    <template>
      <!-- 错误：不要在事件回调里调用 composable -->
      <!-- <button @click="useFetch('/api/users')">load</button> -->
      <button @click="refresh">refresh</button>
    </template>
    ```

## 注意事项 {#caveats}

- **"上下文"一词被严重重载。** 

  在 Vue/Nuxt/Nitro 生态中，"上下文"至少指代四种东西：浏览器上下文、Vue/Nuxt 框架上下文、Nitro/H3 框架上下文、event context（`event.context`）。阅读文档或讨论时务必先确认指的是哪一种。

- **ALS 上下文丢失是隐蔽陷阱。** 
 
 `useEvent` 等隐式上下文函数依赖 AsyncLocalStorage，在 `await` 之后上下文可能丢失。这与前端异步操作后 `getCurrentInstance()` 返回 `null` 是同一类问题，服务端尤其要注意。

 
- **前端 composable 绝不能写在事件回调里。** 
 
 `useFetch`、`useState` 等必须在 `<script setup>` 顶层或嵌套 composable 中调用。事件回调中用 `$fetch` 替代。

- **`useRuntimeConfig` 前后端同名但实现不同。** 
 
 前端只能访问 public 部分，服务端可访问 private 部分；底层一个读全局对象，一个解析环境变量。不要因为名字相同就假设行为一致。

- **Nitro 的 `utils/` 混放是设计选择而非疏忽。** 
 
 带上下文依赖的函数和纯工具函数放在同一个 `utils/` 里，靠函数签名区分是否需要 `event`，比额外拆文件夹更实用。
 
- **Wrapped Event Handler 是服务端 composable 的等价物。**
  
 前端用 composable 封装可复用的响应式逻辑，服务端用包装事件处理器封装可复用的请求处理逻辑（鉴权、日志等）。两者形态不同，但"封装复用"的目的是一致的。
 
- **作者提到后续会深入讲 context 与 ALS。**
  
 当前视频只是入门介绍，AsyncLocalStorage 与上下文在异步操作中的行为是一个独立的复杂话题，需要单独深入。
 