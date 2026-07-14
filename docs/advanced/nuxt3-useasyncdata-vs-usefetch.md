# useAsyncData与useFetch对比 {#nuxt3-useasyncdata-vs-usefetch}

数据获取（Data Fetching）是几乎每个应用都逃不开的环节。

Nuxt 3 提供了两个内置的数据获取 Composable——`useFetch` 和 `useAsyncData`——再加上底层的 `$fetch` 请求函数，很多人第一反应是：
**为什么要有两个？它们到底有什么区别？我该用哪个？**

如果不理解它们的关系，容易踩两类坑：一是在服务端渲染（SSR）场景下重复请求，导致数据被 fetch 两次；二是查询参数（query
params）变化时数据不自动刷新，或者反过来意外触发了不该有的请求。

本文的核心结论是：**`useFetch` 本质上就是 `useAsyncData` 搭配 `$fetch` 的封装**。

## 一、三个角色：$fetch、useAsyncData、useFetch {#nuxt3-useasyncdata-vs-usefetch-roles}

先理清三者的定位，这是理解一切的基础。

| 名称             | 定位                                                                   | 是否处理 SSR 去重 |
|----------------|----------------------------------------------------------------------|-------------|
| `$fetch`       | 底层请求函数（由 [ofetch](https://github.com/unjs/ofetch) 提供），只负责发一个 HTTP 请求 | 否           |
| `useAsyncData` | 异步数据 Composable，负责在 SSR 与客户端之间管理数据状态、缓存与去重                           | 是           |
| `useFetch`     | `useAsyncData` + `$fetch` 的封装糖，为常见的「请求某 URL」场景开箱即用                   | 是           |

关键点在于：**`$fetch` 本身不具备 SSR 去重能力**。

如果你在组件里直接用 `$fetch`，请求会在服务端跑一次、hydration 后客户端又跑一次，白白多请求一遍。

`useAsyncData` 的存在正是为了包裹异步逻辑、把结果序列化进 payload，从而让客户端复用服务端已经取好的数据。

## 二、使用 useFetch：最省心的方式 {#nuxt3-useasyncdata-vs-usefetch-usefetch}

对于「给定一个 URL、取回数据」的常规场景，`useFetch` 是最简洁的选择：

```ts
const {data, status, error} = await useFetch('/api/products')
```

它一步到位地帮你完成了请求、SSR 去重、状态管理。返回的 `data` 是一个响应式的 `ref`。

**添加查询参数**

附加 query 参数，通过 `query` 选项传入：

```ts
const {data} = await useFetch('/api/products', {
    query: {
        category: 'shoes'
    }
})
```

**让查询参数保持响应式**

这是本节的重点。如果查询参数来自一个会变化的 `ref`，直接传值会「拍平」成静态值，参数变化后不会重新请求。正确做法是**传入 `ref`
本身（或用计算函数）**，`useFetch` 会自动侦测其变化并重新发起请求：

```ts
const category = ref('shoes')

const {data} = await useFetch('/api/products', {
    // ✅ 直接传 ref，useFetch 会监听它的变化
    query: {category}
})

// 之后修改 category.value，useFetch 自动重新请求
category.value = 'boots'
```

`useFetch` 默认会 watch 其 URL 和 options 中的响应式源，因此参数变化能自动触发刷新——这正是它「省心」的地方。

## 三、拆解 useFetch：用 useAsyncData + $fetch 复刻它 {#nuxt3-useasyncdata-vs-usefetch-replicate}

为了证明「`useFetch` 就是语法糖」，如何用 `useAsyncData` 加 `$fetch` 手动实现等价效果。

**基本形态**

`useAsyncData` 接收两个核心参数：一个**唯一 key**（用于缓存与去重），以及一个返回 Promise 的**处理函数（handler）**：

```ts
const {data} = await useAsyncData(
    'products',                    // 唯一 key
    () => $fetch('/api/products')  // handler：内部用 $fetch 发请求
)
```

这里的组合恰好还原了 `useFetch` 的核心：`useAsyncData` 负责 SSR 去重与状态管理，`$fetch` 负责实际请求。

**手动处理查询参数的响应式**

用 `useFetch` 时参数响应式是自动的；换成 `useAsyncData` 后，需要你**自己接管**。有两处要点：

第一，把响应式参数用到 handler 里：

```ts
const category = ref('shoes')

const {data} = await useAsyncData(
    'products',
    () => $fetch('/api/products', {
        query: {category: category.value} // 在 handler 内取 .value
    })
)
```

第二，`useAsyncData` **不会自动 watch** handler 内部用到的响应式数据，所以要通过 `watch` 选项显式声明依赖，参数变化才会重新请求：

```ts
const category = ref('shoes')

const {data} = await useAsyncData(
    'products',
    () => $fetch('/api/products', {
        query: {category: category.value}
    }),
    {
        // ✅ 显式声明要监听的响应式源
        watch: [category]
    }
)
```

这正是 `useFetch` 与 `useAsyncData` 在响应式上的**核心差异**：前者默认帮你 watch，后者需要你手动指定 `watch`。

## 如何选择 {#nuxt3-useasyncdata-vs-usefetch-choose}

- **请求一个 URL 拿数据** → 直接用 `useFetch`，简洁且响应式自动化。
- **逻辑更复杂**（比如需要组合多个请求、调用非 `$fetch` 的异步方法、对结果做复杂处理、或需要更精细地控制何时重新请求）→ 用
  `useAsyncData`，把自定义异步逻辑放进 handler。

换句话说，`useFetch` 覆盖 80% 的常规场景，`useAsyncData` 则是需要掌控细节时的「底层出口」。

## 常见案例 {#nuxt3-useasyncdata-vs-usefetch-cases}

1. **默认用 `useFetch`**：单一 URL 请求场景，一行搞定，享受自动 SSR 去重与响应式。
2. **查询参数用 ref 传入**：`useFetch(url, { query: { category } })`，参数变化自动重新请求。
3. **复杂逻辑切到 `useAsyncData`**：需要组合多个 `$fetch`、或调用其他异步 API 时使用。
4. **给 `useAsyncData` 一个稳定唯一的 key**：这是缓存与去重的依据，不要用随机值。
5. **在 handler 内取 `.value`**：`useAsyncData` 的 handler 里访问响应式源时记得解引用。
6. **手动配 `watch`**：`useAsyncData` 不自动侦测依赖，用 `{ watch: [dep] }` 声明需要监听的源。
7. **组件内绝不裸用 `$fetch` 取初始数据**：它没有 SSR 去重，会导致请求跑两遍；`$fetch` 更适合事件回调（如提交表单）里的一次性请求。

## 注意事项 {#nuxt3-useasyncdata-vs-usefetch-notes}

| 事项                    | 说明                                                                  |
|-----------------------|---------------------------------------------------------------------|
| **`useFetch` 是语法糖**   | 它 = `useAsyncData` + `$fetch`，理解这点就理解了全部行为差异。                       |
| **`$fetch` 无 SSR 去重** | 直接在渲染路径里用会请求两次；只在客户端交互（点击、提交）等场景单独用它。                               |
| **响应式自动 vs 手动**       | `useFetch` 默认 watch URL/options 里的响应式源；`useAsyncData` 需要显式 `watch`。 |
| **key 必须唯一且稳定**       | `useAsyncData` 依赖 key 做缓存和去重，重复或多变的 key 会破坏预期行为。                    |
| **query 传 ref 而非值**   | 传静态值会「定格」参数，失去响应式刷新能力（呼应「避免丢失响应式」的原则）。                              |
| **`.value` 时机**       | handler 内部访问响应式源要用 `.value`，且确保它被列入 `watch`，否则不会触发重新请求。             |

`useFetch`/`useAsyncData` 还提供 `server`、`lazy`、`immediate`、`transform`、`pick` 等选项，可进一步控制请求时机与 payload
体积。若只是想减少传输体积，用 `pick` 或 `transform` 在服务端裁剪数据往往比事后处理更划算。
