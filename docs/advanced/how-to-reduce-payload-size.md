# 如何精简 `__NUXT__` Payload体积 {##reduce-payload-size}

Nuxt 3 会把 SSR 数据写入 `window.__NUXT__`，字段冗余会让 HTML 暴涨；通过 `useFetch` 的 `transform` 只留下页面真正需要的字段，是最直接的瘦身手段。

Nuxt 在服务端渲染（SSR）或静态生成（SSG）时，会把页面用到的接口数据序列化后注入到 HTML 文档的 `window.__NUXT__` 中（SSG 场景下还会额外生成 `payload.json`）。

这份数据的作用是让客户端「水合（Hydration）」时不需要重新请求接口就能复用服务端拿到的数据。

问题在于：如果接口返回了几十上百个字段，而页面只用其中的三四个，那些用不到的字段依然会原样进入 `__NUXT__`——直接体现为 HTML 文档体积膨胀、首屏字节数飙升、TTFB 与解析成本变差。这在对接大而全的第三方 API（如 Destiny 2、CMS 全字段接口）时尤其严重。

## `__NUXT__` 到底是什么 {#what-is-nuxt-payload}

**载荷（Payload）**：Nuxt 在 SSR 阶段把 `useFetch` / `useAsyncData` 拿到的数据、`useState` 状态等序列化后写入 HTML，客户端启动时通过 `window.__NUXT__` 读取，避免二次请求。

- SSR 模式：数据内嵌在 HTML 中。
- SSG 模式（配合 payload extraction）：额外生成独立的 `payload.json`，路由切换时按需加载。
- 数据键是自动生成的哈希，对应每个 `useFetch` / `useAsyncData` 的调用。

## 三种精简载荷的策略 {#three-strategies-to-reduce-payload}

### 策略一：改造 API，只返回需要的字段 {#refactor-api-to-return-only-needed-fields}

如果 API 在你的团队掌控范围内，最干净的做法是直接在服务端裁剪：

```ts
// server/api/item.ts
export default defineEventHandler(async () => {
  const raw = await fetchFromUpstream()
  return {
    name: raw.item.name,
    flavorText: raw.item.flavorText,
    icon: raw.item.icon,
  }
})
```

如果后端使用 GraphQL，这个问题几乎自动消失——按需选择字段本身就是 GraphQL 的设计目标。

### 策略二：BFF（Backend For Frontend）代理层 {#bff-proxy-layer}

当外部 API 不在你的控制之下、又不想把冗余字段扛回前端时，用 Nitro 起一个代理端点，在服务端完成裁剪：

```ts
// server/api/item.ts
export default defineEventHandler(async () => {
  const upstream = await $fetch('https://external.api/item/123')
  return pickFields(upstream)   // 在服务端就砍掉冗余
})
```

这就是所谓的 **BFF 模式**：前端只与自家 Nitro 端点通信，外部 API 的复杂性、鉴权、字段裁剪都收敛在后端。

### 策略三：`useFetch` 的 `transform` 选项（最轻的方案）{#transform-option-of-usefetch}

无法改动 API、也不想为每个调用都新建 Nitro 端点时，直接在 `useFetch` / `useAsyncData` 的 `transform` 里裁剪——**`transform` 的返回值才是最终写入 payload 的内容**。

```vue
<script setup>
const { data } = await useFetch('/api/item', {
  transform: (input) => ({
    name: input.item.name,
    flavorText: input.item.flavorText,
    icon: input.item.icon,
  }),
})
</script>

<template>
  <h1>{{ data.name }}</h1>
  <p>{{ data.flavorText }}</p>
  <img :src="data.icon" />
</template>
```

需要注意的是，`transform` 之后 `data` 的类型也会随返回值变化——原来的 `data.item.name` 需要改成 `data.name`，TypeScript 会立刻给出提示。

### 加分项：Nuxt Content 的字段裁剪 {#nuxt-content-field-filtering}

如果使用 `@nuxt/content`，`queryContent()` 提供了 `.only()` / `.without()`：

```ts
const { data } = await useAsyncData('post', () =>
  queryContent('/posts/hello').only(['title', 'description', 'date']).findOne()
)
```

同样是把字段过滤放到服务端完成，避免整篇 Markdown Frontmatter 灌进 payload。

| 方案                       | 前提          | 改动量      | 复用性      |
|--------------------------|-------------|----------|----------|
| 改造 API / 加 filter 参数     | API 自己控制    | 中，需要后端配合 | 高        |
| Nitro BFF 代理 + 转换层       | 外部 API 不可控  | 中偏高      | 高        |
| `useFetch` 的 `transform` | 任意场景，尤其 SSG | 极小       | 一次性、按调用点 |

## 实操清单

1. 打开 DevTools 查看 HTML 文档大小，源码里搜索 `window.__NUXT__` 感受一下 payload 体积。
2. API 自控：直接在服务端裁剪字段，或新增查询参数支持字段选择。
3. API 不自控：先考虑 Nitro BFF 端点，把裁剪与转换收敛到服务端。
4. 项目采用 SSG 或只是想快速见效：给 `useFetch` / `useAsyncData` 加上 `transform`，只保留模板真正用到的字段。
5. 使用 Nuxt Content 时，用 `.only()` / `.without()` 精选 Frontmatter。
6. 上线前对比改造前后的 `payload.json`（SSG）或 HTML 体积（SSR），确认瘦身生效。

## 常见坑与注意事项

- **`transform` 会改变 `data` 类型**：模板、`computed`、下游 composable 中所有引用路径都要跟着改，TypeScript 报错是好事，别忽略。
- **只影响 payload，不影响接口响应**：`transform` 发生在前端框架层，接口本身仍然会传完整数据，网络体积不会因此减少——想同时减小网络请求，只能走策略一或策略二。
- **key 是自动生成的哈希**：`window.__NUXT__` 里的键看起来随机，是 Nuxt 根据调用位置生成的，不必手动维护；必要时可以用 `useFetch` 的 `key` 选项自定义。
- **SSG + payload extraction**：静态生成模式下，payload 会被抽成独立的 `payload.json`，路由切换按需加载，此时策略三收益最明显。
- **`useAsyncData` 同理**：`transform` 不是 `useFetch` 独有的选项，`useAsyncData` 也支持，同样的思路可以套用到任意异步数据源。
- **别在 `transform` 里做重活**：它会在服务端与客户端都执行（水合时），逻辑越轻越好，重计算应留在服务端接口层。
- **配合 `pick` 选项**：Nuxt 也提供了 `pick: ['name', 'flavorText']` 这种浅层字段选择，适用于「一层扁平」的响应；深层嵌套依然要靠 `transform`。