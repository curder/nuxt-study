# Nuxt 3.8 - 使用 getCachedData 进行客户端缓存 {#get-cached-data}

> 利用 Nuxt 3.8 引入的 `getCachedData` 配置项，通过自定义缓存逻辑拦截冗余的 API 请求，实现客户端数据的高效复用与精细化 TTL 控制。

::: info 技术逻辑详解：`getCachedData` 的工作机制
在 Nuxt 3 的数据获取生命周期中，`getCachedData` 充当了**请求拦截层（Request Interceptor）**。

当 `useFetch` 或 `useAsyncData` 被触发时，Nuxt 会在执行网络 I/O 之前优先调用此函数。它允许开发者直接访问 `nuxtApp.payload`（即 Nuxt 的全量状态快照）。如果该函数返回了非空值，Nuxt 将立即进入 **Resolved** 状态，跳过后续的 Fetch 动作及 Nitro 代理转发。这本质上是将传统的 **HTTP 层缓存** 逻辑下沉到了 **应用状态层**，从而消除了网络往返时延（RTT）。
:::

| 特性 | 方案 A：默认 `useFetch` / `useAsyncData` | 方案 B：使用 `getCachedData` (Nuxt 3.8+) |
| :--- | :--- | :--- |
| **核心优势** | 实现简单，数据永远是最新的。 | **大幅减少 API 调用**，提升二次访问速度。 |
| **潜在劣势** | 每次组件挂载或路由切换都会重新触发请求，浪费资源。 | 若逻辑不当可能导致数据陈旧（Stale Data），增加逻辑复杂度。 |
| **性能表现** | 存在明显的网络延迟。 | **首屏后接近瞬时加载**（从内存读取）。 |
| **推荐场景** | 实时性极强的数据（如股票价格、聊天消息）。 | **变动频率低的数据**（如文章列表、用户信息、配置项）。 |

## 代码演示 {#code-demonstration}

遵循 Nuxt 3 最佳实践，我们通过 `getCachedData` 实现带有过期逻辑的缓存。

```typescript
// 场景：在 Nuxt 3 中实现一个带有 5 秒生存时间 (TTL) 的客户端缓存逻辑
// 目标：在路由切换回本页面时，如果数据未过期，则不触发网络请求。

const { data, refresh } = await useFetch('/api/products', {
  key: 'products-list', // 必须指定唯一的 key 以便从 Nuxt 实例中检索数据
  
  /**
   * getCachedData 在请求发起前被调用
   * @param key 数据的唯一标识
   * @param nuxtApp 当前 Nuxt 实例
   * @returns 如果返回数据，则跳过本次 fetch；如果返回 null/undefined，则继续请求。
   */
  getCachedData(key, nuxtApp) {
    // 从 Nuxt 状态快照中检索已有的数据
    const data = nuxtApp.payload.data[key] || nuxtApp.static.data[key]
    
    if (!data) return
    
    // 自定义 TTL (Time To Live) 校验逻辑
    const expirationTime = 5000 // 5000ms 过期阈值
    const isExpired = Date.now() - (data.fetchedAt || 0) > expirationTime
    
    if (isExpired) {
      return // 返回 undefined 以触发重新抓取 (Re-fetch)
    }

    return data // 命中缓存，直接复用状态
  },

  // 在数据获取成功后，利用 transform 注入元数据用于后续 TTL 校验
  transform: (payload) => {
    return {
      ...payload,
      fetchedAt: Date.now()
    }
  }
})
```

## 实践案例 {#practical-example}

### 1. 全局缓存策略封装 {#global-cache-strategy}
为了避免在每个页面重复编写逻辑，可以封装一个通用的 Composable。

```typescript
// composables/useCustomFetch.ts
export const useCustomFetch = (url: string, options: any = {}) => {
  const nuxtApp = useNuxtApp()
  const ttl = options.ttl || 60000 // 默认 60s 过期

  return useFetch(url, {
    ...options,
    getCachedData(key) {
      const cached = nuxtApp.payload.data[key]
      if (cached && Date.now() - cached.fetchedAt < ttl) {
        return cached
      }
    },
    transform: (data) => ({
      ...data,
      fetchedAt: Date.now()
    })
  })
}
```

### 2. 配合 `watch` 实现动态参数缓存 {#dynamic-parameter-cache}
当请求参数变化时，`key` 也随之变化，从而实现不同参数下的精细化缓存。

```typescript
const page = ref(1)
const { data } = await useFetch('/api/posts', {
  key: `posts-page-${page.value}`, // 关键：key 必须映射动态状态
  query: { page },
  getCachedData(key, nuxtApp) {
    // 简单的持久化缓存策略（直到 Session 结束）
    return nuxtApp.payload.data[key]
  }
})
```

### 3. 跨页面数据共享（Data Sharing）{#cross-page-data-sharing}
在列表页获取数据后，详情页如果需要相同的数据，可以通过相同的 `key` 直接命中缓存。

```typescript
// 详情页 logic
const { data } = await useFetch(`/api/user/${id}`, {
  key: `user-profile-${id}`,
  getCachedData(key, nuxtApp) {
    // 如果其他组件已经预填充了该 key 的 payload，将实现“零延迟”加载
    return nuxtApp.payload.data[key]
  }
})
```

## 开发者避坑指南 {#developer-pitfalls-guide}

- **避坑点：Key 的冲突与唯一性**  
  `getCachedData` 机制完全基于 `key` 索引。若未手动指定，Nuxt 会基于上下文自动生成。在动态路由场景下，务必手动构造 `key`（例如：`key: `product-${route.params.id}``），否则会导致不同资源共用同一个缓存槽位。

- **避坑点：对象序列化限制**  
  缓存在客户端由 `nuxtApp.payload.data` 承载，这意味着数据必须符合 **JSON 可序列化** 标准。缓存 Class 实例或包含循环引用的对象会导致水合（Hydration）失败或原型链丢失。

- **进阶技巧：强制刷新机制**  
  即使定义了 `getCachedData`，显式调用 `refresh()` 方法依然会无视缓存逻辑，强制发起网络请求。建议在 UI 上提供手动刷新按钮，以应对缓存失效或数据不一致的情况。

- **进阶技巧：SSR 阶段的行为差异**  
  `getCachedData` 主要优化的是客户端导航（Client-side Navigation）。在 SSR 阶段，由于 `nuxtApp.payload` 正在构建中，通常不会触发缓存命中，从而确保爬虫获取的是最新生成的 SEO 数据。
