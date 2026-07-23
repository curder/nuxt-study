# Repository模式优雅封装API {#nuxt-3-repository-pattern-custom-fetch}

讲清如何在 Nuxt 3 中用 Repository 模式抽象 API 调用，并配合自定义 `$fetch` 实例统一处理 baseURL、请求头等配置，用 `$fetch` 而非组合式函数来实现，兼顾复用性与灵活性。

**Repository 模式（repository pattern）**是抽象 API 调用的一种流行做法：把「怎么请求」的细节封装起来，对外只暴露语义化的方法，比如 `repository.users.getById(1)`、`repository.posts.create(data)`。

业务代码不再关心 URL 拼接、请求头、错误处理，只管调用描述性的方法。

但在 Nuxt 里落地这个模式时，很多人会犹豫：**该用组合式函数（composable）** 还是 `$fetch`？

本文围绕这个思路，一步步实现一个可复用、支持 SSR、且能通过 `runtimeConfig` 配置的 Repository 层。

## 为什么 Repository 用 `$fetch` 而非 composable {#why-repository-use-fetch}

`useFetch` / `useAsyncData` 是组合式函数，只能在顶层等特定位置调用，会自动管理响应式状态、监听依赖、参与 SSR payload。

而 Repository 的方法本质是「按需发起一次请求」的普通函数，可能在事件处理、其它函数中被调用。

如果把 `useFetch` 塞进去，就会重蹈「在函数里调用 composable」的覆辙——实例难以清理、行为不可控。

因此正确分层是：

- **Repository 层**：用 `$fetch` 封装具体请求，返回 Promise。
- **组件层**：需要 SSR 数据时，用 `useAsyncData` 包裹 Repository 方法。

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

// 组件里用 useAsyncData 包裹 repository 调用，享受 SSR
const { data: users } = await useAsyncData('users', () => $api.users.list())
</script>
```

## 实现 Repository 模式 {#implement-repository-pattern}

先定义一个 Repository 工厂。做法是：**把 `$fetch` 实例作为参数传入**，Repository 内部只负责组织具体端点。

```ts
// repository/users.ts
import type { $Fetch } from 'ofetch'

export const usersRepository = (fetch: $Fetch) => ({
  async list() {
    return fetch('/users')
  },
  async getById(id: number) {
    return fetch(`/users/${id}`)
  },
  async create(payload: { name: string }) {
    return fetch('/users', {
      method: 'POST',
      body: payload
    })
  }
})
```

这里的关键设计是 `fetch` 由外部注入，而不是在 Repository 内部写死。

这样 Repository 既可以配合 Nuxt 的全局 `$fetch`，也能在测试或其它环境里传入不同实例，保持解耦。

## 创建自定义 `$fetch` 实例 {#create-custom-fetch-instance}

Nuxt 里的 `$fetch` 来自 `ofetch`，它提供了 `create` 方法，允许你**预置一批默认配置**（baseURL、headers、拦截器等），生成一个专用实例。

```ts
// 创建一个带默认配置的 $fetch 实例
const api = $fetch.create({
  baseURL: 'https://api.example.com',
  headers: {
    Authorization: 'Bearer token'
  },
  onResponseError({ response }) {
    // 统一错误处理
    console.error('API error', response.status)
  }
})
```

有了这个自定义实例，Repository 里所有请求都会自动带上 baseURL 和请求头，无需在每个方法里重复书写。

## 全局提供 `$fetch` + 结合 runtimeConfig {#global-provide-fetch-runtimeconfig}

最优雅的落地方式是通过 **Nuxt 插件**创建自定义实例并全局注入，同时用 `runtimeConfig` 让 baseURL 等可在运行时配置。

先在 `nuxt.config` 声明配置：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      apiBase: 'https://api.example.com'
      // 运行时可用 NUXT_PUBLIC_API_BASE 覆盖
    }
  }
})
```

然后写一个插件，创建实例并把整套 Repository `provide` 出去：

```ts
// plugins/api.ts
import { usersRepository } from '~/repository/users'
import { postsRepository } from '~/repository/posts'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // 用 runtimeConfig 的 baseURL 创建自定义 $fetch 实例
  const apiFetch = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      // 例如统一注入鉴权头
    },
    onResponseError({ response }) {
      // 统一错误处理
    }
  })

  // 组装各个 repository，注入同一个 fetch 实例
  const api = {
    users: usersRepository(apiFetch),
    posts: postsRepository(apiFetch)
  }

  return {
    provide: {
      api
    }
  }
})
```

之后在任何组件或 composable 中，通过 `useNuxtApp().$api` 即可访问：

```vue
<script setup lang="ts">
const { $api } = useNuxtApp()

const { data: user } = await useAsyncData('user-1', () => $api.users.getById(1))
</script>
```

这套结构的好处：**SSR 友好、配置集中、类型完整、既能配合组合式函数也能独立调用**。

因为底层是 `$fetch`，它既能在服务端跑，也能在客户端跑，不受组合式函数调用位置的限制。

> 用 `runtimeConfig.public.apiBase` 而非 `process.env` 来配置 baseURL，是为了让地址能在**运行时**通过 `NUXT_PUBLIC_API_BASE` 覆盖

## 落地步骤 {#implementation-steps}

1. 为每类资源写一个 Repository 工厂（如 `usersRepository`），**接收 `$fetch` 实例作为参数**。
2. Repository 内部只用传入的 `fetch` 组织端点，方法返回 Promise，不使用 `useFetch`。
3. 用 `$fetch.create()` 创建带 baseURL、headers、拦截器的自定义实例。
4. 在 `nuxt.config` 用 `runtimeConfig.public.apiBase` 声明可配置的地址。
5. 写一个插件读取 `runtimeConfig`、创建实例、组装各 Repository，并 `provide` 为 `$api`。
6. 组件中通过 `useNuxtApp().$api` 调用；需要 SSR 数据时用 `useAsyncData` 包裹。

## 注意事项 {#implementation-notes}

| 事项                                  | 说明                                               |
|-------------------------------------|--------------------------------------------------|
| Repository 用 `$fetch` 而非 composable | 方法可能在任意位置调用，用 `useFetch` 会重蹈滥用覆辙                 |
| `$fetch` 实例应外部注入                    | 便于解耦、测试与替换，不在 Repository 内写死                     |
| 用 `$fetch.create()` 集中配置            | baseURL、headers、拦截器统一管理，避免重复                     |
| baseURL 用 `runtimeConfig`           | 支持 `NUXT_PUBLIC_API_BASE` 运行时覆盖，别用 `process.env` |
| 需要 SSR 数据时包一层                       | 组件里用 `useAsyncData(() => $api.xxx())` 获得 SSR 与缓存 |
| 通过插件 `provide` 全局可用                 | 以 `$api` 形式在全应用共享同一实例                            |

Repository 模式在 Nuxt 中的核心心法是**分层**：Repository 用注入的自定义 `$fetch` 封装「怎么请求」，组件层再用 `useAsyncData` 决定「何时以 SSR 方式取数」。

两者各司其职，就能得到一套既优雅、又对 SSR 友好的 API 抽象。