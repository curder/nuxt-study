# Nuxt 与 Nitro 的分工 {#nuxt-vs-nitro-what-does-what}

为什么 `server` 目录里用不了 `Vue`/`Pinia` 组合式函数、SSR 时两者如何交汇，以及 `runtimeConfig` 的公私两端分别归谁管。

Nuxt 建立在一大堆独立包之上，这种设计的好处是每个包都能被单独隔离、复用（甚至用在其他框架里）、独立测试。

其中最关键的一块就是 **Nitro**，Nuxt 的服务器引擎（server engine）。

问题在于：一旦涉及 Nuxt 的「服务端」部分，很多开发者就分不清边界了。典型的困惑包括：

- 为什么在 `server/` 目录里没法用 Pinia 或 Vue 的组合式函数（composables）？
- SSR 到底是 Nuxt 在做还是 Nitro 在做？
- `runtimeConfig` 的私有部分为什么在组件里也可能被读到？

## Nuxt 文档告诉我们的事 {#nuxt-docs-tell-us}

Nuxt 官方文档的 [server 章节](https://nuxt.com/docs/getting-started/server) 明确写着：**Nuxt is powered by Nitro**。这意味着不只是 SSR，以下能力其实都来自 Nitro：

- 自定义 **API 路由 / server routes**
- 平滑的跨平台部署（几乎任何平台）
- **route rules**（路由规则）
- **hybrid rendering**（混合渲染）与 **caching**（缓存）

而 Nitro 本身是一个完全独立（standalone）的包，你甚至可以脱离 Nuxt 使用它来替代 Koa、Fastify、Express 等 HTTP 框架，从零搭一个干净、现代、基于 TypeScript 的服务端。

补充一层依赖关系（视频提到但值得强调）：

```
Nuxt  →  Nitro  →  h3
```

Nitro 底层用的是 **h3**，一个更低层的包，提供了大量在 Nitro 上下文中会用到的工具函数（utilities）。

## 为什么 server 目录里用不了 Vue composables {#why-cant-use-vue-composables-in-server}

**你不能用，做不到。** 原因在于运行时机：

> 当 Nitro 启动时，那里只有 Nitro，根本不存在 Nuxt 应用。

所以当你的 API 路由被请求命中时，整个过程里**没有任何 Nuxt / Vue 在运行**，全是 Nitro。

既然没有 Vue 应用实例，Pinia、Vue 组合式函数这类依赖 Vue 运行时上下文的东西自然无从谈起。

```ts
// server/api/hello.ts 这里只有 Nitro，没有 Nuxt / Vue
export default defineEventHandler((event) => {
  // ✅ 可以用 Nitro / h3 的工具，比如读取请求
  // ❌ 不能用 usePinia() / 任何 Vue composable
  return { message: 'hello from Nitro' }
})
```

## runtimeConfig：横跨两端的最佳示例 {#runtime-config-best-example}

`runtimeConfig` 分为**公有（public）**和**私有（private）**两部分，正好演示了这条边界。

- **public** 部分：客户端也能拿到（`runtimeConfig.public`）。
- **private** 部分：只保留给安全上下文（secure context），即服务端，也就是 Nitro 那一侧，用来放密钥等敏感信息。

那么中间交汇区（SSR）会发生什么？**因为 SSR 跑在 Nitro 上下文里，此时服务端同时能访问 public 和 private 两部分**。

```vue
<script setup>
const config = useRuntimeConfig()
// SSR 期间（Nitro 上下文）：public + private 都可读
// 客户端：只有 public 可读
</script>

<template>
  <!-- ⚠️ 危险：SSR 时会把 private 也渲染进 HTML 泄露出去 -->
  <pre>{{ config }}</pre>
</template>
```

> **不要**在 Nuxt 组件里直接输出 `$config` / 整个 `runtimeConfig`。因为 SSR 阶段私有部分是可用的，直接打印会把私密信息渲染进 HTML 泄露出去。

## Server Components 与边界 {#server-components-and-boundary}

如今可以用 **server components**（服务端组件）把数据库代码（比如查询 MongoDB、SQL）放进去，而不必塞进普通 Nuxt 组件里。

但即便是 server components，它们也是**通过 Nitro 路由被服务端渲染**的，所以本质上仍然是「两者协作」的又一个体现。

> 如果用了 SSR，可以写出同时在服务端和客户端执行的代码；但 **server 目录里的一切都是严格 server-only 的，那里还没有 Vue、没有 Nuxt**。

## useRequestEvent：只在服务端有值 {#use-request-event-only-on-server}

一个实用的组合式函数 **`useRequestEvent`**，用于在 Nuxt 应用中拿到请求事件，**但仅在服务端渲染时有效**。

```ts
const event = useRequestEvent()
// 服务端渲染时：返回真实的 request event（可读 headers 等）
// 浏览器中调用：返回 undefined
```

- 从 page A 客户端导航到 page B，在 B 里调用 `useRequestEvent()` → 得到 `undefined`（因为是客户端导航，没有服务端请求）。
- 若在 page B **硬刷新（hard reload）**，触发服务端渲染 → `useRequestEvent()` 就会包含真实事件。

这在需要读取请求头，或做一些「仅服务端」的操作时非常有用。

## 常见案例 {#common-cases}

判断一段代码归 Nitro 还是 Nuxt，只需要问自己一个核心问题：**这段代码在什么时机、什么上下文里执行？** 下面把每种典型场景拆开讲清楚判断依据、正确写法和踩坑点。

### 1. 写在 `server/` 目录里的代码是纯 Nitro 领地 {#server-code-is-nitro-only}

只要文件位于 `server/`（如 `server/api/`、`server/routes/`、`server/middleware/`），它就**只在 Nitro 里运行**，此刻根本没有 Nuxt/Vue 实例。

所以这里**不能**用 Pinia、`useState`、`useAsyncData` 这类依赖 Vue 运行时的组合式函数；能用的是 Nitro / h3 提供的服务端工具。

```ts
// server/api/user.get.ts
export default defineEventHandler((event) => {
  // ✅ Nitro / h3 工具
  const query = getQuery(event)
  const headers = getRequestHeaders(event)

  // ✅ 服务端读 runtimeConfig（能拿到 private）
  const config = useRuntimeConfig(event)

  // ❌ 绝对不行：这里没有 Vue 应用
  // const store = useUserStore()
  return { id: query.id }
})
```

**判断口诀**：路径在 `server/` 下 → 一律当作后端代码写，别想着复用前端 store 或 composable。

### 2. 需要密钥 / 敏感配置交给 Nitro 侧 {#sensitive-config-to-nitro}

`runtimeConfig` 的**私有部分**只应在安全上下文（secure context）读取，也就是服务端。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',            // 私有：仅服务端可读
    public: {
      apiBase: ''             // 公有：客户端也能拿到
    }
  }
})
```

```ts
// server/api/pay.post.ts 密钥只在这里出现
const { apiSecret } = useRuntimeConfig(event)
```

**判断口诀**：凡是「泄露了就出事」的值（数据库连接串、第三方密钥）→ 放 `runtimeConfig` 顶层（private），并且只在 `server/` 或 SSR 上下文里读。

### 3. 要用组合式函数放进组件，靠 SSR + 客户端跑 {#use-composable-in-component}

**server 目录里用不了 composable，但被服务端渲染的组件里可以用**。因为组件在 SSR 期间由 Nitro 执行，随后又在客户端 hydration 时再跑一次，这正是「中间交汇区」。

```vue
<script setup>
// ✅ 组件里可以：SSR 时在 Nitro 上下文执行，客户端再执行一次
const { data } = await useAsyncData('posts', () => $fetch('/api/posts'))
const store = useUserStore() // Pinia 在组件里没问题
</script>
```

**判断口诀**：想用 `useXxx()` → 它必须待在组件 / `app.vue` / 插件等 Nuxt 上下文里，而不是 `server/` 路由里。

### 4. 要读请求头等服务端上下文，用 `useRequestEvent`，并判空 {#use-request-event-with-null-check}

`useRequestEvent()` 能在 Nuxt 应用里拿到请求事件，**但仅在服务端渲染时有值**。

- 从 page A **客户端导航**到 page B，B 里调用 → 返回 `undefined`（没有服务端请求发生）
- 在 page B **硬刷新（hard reload）**，触发 SSR → 能拿到真实 event

```ts
const event = useRequestEvent()
// 客户端导航时 event 可能是 undefined，必须判空
const lang = event ? getRequestHeader(event, 'accept-language') : undefined
```

**判断口诀**：需要 headers / cookie / 真实请求路径 → 只能在 SSR 阶段拿，写代码时默认它在客户端会是 `undefined`。

### 5. 把数据库查询隔离出组件，用 server components（仍经 Nitro） {#isolate-db-query-with-server-components}

如今可以用 **server components**（服务端组件，文件名以 `.server.vue` 结尾）把数据库代码（如查 MongoDB、SQL）从普通组件里剥离出去。但要记住：**即便是 server component，它也是通过 Nitro 路由被服务端渲染的**，本质仍是「两者协作」。

```
components/
  UserList.server.vue   # 只在服务端渲染，可安全写 DB 查询
```

**判断口诀**：不想让数据库代码进客户端 bundle → 用 `.server.vue`，但心里清楚它跑在 Nitro 里，别在其中期待客户端交互逻辑。

### 6. 想脱离 Nuxt 单用服务端能力，Nitro 可独立使用 {#standalone-nitro}

Nitro 是**完全独立（standalone）**的包，可以脱离 Nuxt 直接用它替代 Koa、Fastify、Express 等 HTTP 框架，从零搭建一个基于 TypeScript 的现代服务端。底层依赖链是 `Nuxt → Nitro → h3`。

**判断口诀**：只需要一个纯后端 / API 服务、用不上 Vue → 直接上 Nitro，不必背上整个 Nuxt。

| 你的需求          | 归属            | 写在哪里                    | 能否用 composable            |
|---------------|---------------|-------------------------|---------------------------|
| API 端点 / 后端逻辑 | Nitro         | `server/`               | 否                         |
| 读私密密钥         | Nitro（服务端）    | `server/` 或 SSR 上下文     | `useRuntimeConfig(event)` |
| 页面数据获取 / 状态   | Nuxt（SSR+客户端） | 组件 / `app.vue`          | 是                         |
| 读请求头          | 交汇区（SSR）      | 组件内 `useRequestEvent()` | 是（客户端返 undefined）         |
| 隔离数据库查询       | Nitro 渲染      | `*.server.vue`          | 受限                        |
| 纯后端服务         | Nitro（独立）     | Nitro 项目                | 不涉及                       |

> **只要开了 SSR，你可以写出「服务端 + 客户端都执行」的代码；但 `server/` 里的一切是严格 server-only 的，那里没有 Vue、没有 Nuxt。** 记住这条边界，绝大多数「这段代码该放哪」的疑问都能秒答。

## 注意事项

| 事项                               | 说明                                                     |
|----------------------------------|--------------------------------------------------------|
| server 目录禁用 composable           | Nitro 启动时无 Nuxt 实例，Pinia / Vue composable 不可用          |
| 不要直接输出整个 config                  | SSR 上下文能访问 private，`{{ config }}` 会泄露密钥                |
| `useRequestEvent` 客户端为 undefined | 仅 SSR 有值，客户端导航时需判空                                     |
| 区分「组件」与「server 路由」               | 组件靠 SSR 执行 composable，API 路由里则完全没有 Nuxt                |
| 部署与缓存归 Nitro                     | route rules、hybrid rendering、caching、proxy 都由 Nitro 承担 |

## 延伸阅读

- [Nuxt 官方 server 文档](https://nuxt.com/docs/getting-started/server)
- [Nitro 官方文档](https://nitro.build/)
- [h3 仓库](https://github.com/unjs/h3)
- [useRequestEvent API](https://nuxt.com/docs/api/composables/use-request-event)