# 共享数据 sharedPrerenderData {#nuxt-3-10-shared-prerender-data}

Nuxt 3.10 带来了不少特性，其中一个对**预渲染（prerender）、内容密集型（content-heavy）站点**特别有用，那就是实验性的 `sharedPrerenderData`。

预渲染指在构建阶段把页面提前渲染成静态 HTML。

问题在于：当很多页面都调用同一份数据（比如全站导航菜单、分类列表、作者信息、全局配置）时，**每个页面在预渲染时都会各自重新请求一遍**。页面数量一多，这些重复请求（duplicate calls）会成倍拖慢构建时间。

`sharedPrerenderData` 要解决的正是这个痛点：让**基于相同 key 的数据在预渲染的不同页面之间共享**，只获取一次，后续页面直接复用。

## sharedPrerenderData 到底做了什么 {#nuxt-3-10-shared-prerender-data-what}

核心机制可以概括为一句话：**在预渲染期间，按 `useAsyncData` / `useFetch` 的 key 缓存数据，跨页面复用同一份结果。**

Nuxt 中每次 `useAsyncData` 或 `useFetch` 调用都对应一个 **key**（`useFetch` 会根据请求 URL 等自动生成，`useAsyncData` 则由第一个参数显式指定）。

开启 `sharedPrerenderData` 后：

- 第一个页面预渲染时，某个 key 的数据被真正获取并缓存；
- 之后其它页面预渲染时，若遇到相同 key，直接取用缓存，**不再重复请求**。


## 重复请求是怎么发生的 {#nuxt-3-10-shared-prerender-data-duplicate-calls}

用一个简单 demo 演示问题：站点里多个页面都通过 `useAsyncData` 拉取同一份数据（例如公共列表）。

```vue
<script setup lang="ts">
// 假设每个页面都会用到的公共数据
const { data: categories } = await useAsyncData(
  'categories',
  () => $fetch('/api/categories')
)
</script>
```

在预渲染时，如果站点有 100 个页面、每个页面都调用 `useAsyncData('categories', ...)`，那么 `/api/categories` 就会被请求 100 次，尽管每次拿到的都是相同结果。

对于内容多、页面多的站点，这类冗余请求会明显拉长构建时间。

## 如何减少重复请求：开启 sharedPrerenderData {#nuxt-3-10-shared-prerender-data-enable}

解决方式非常简单，在 `nuxt.config` 中开启对应的实验性选项：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: {
    sharedPrerenderData: true
  }
})
```

开启后，预渲染阶段相同 key 的数据只会被获取一次，其余页面复用缓存结果。

对于前面 100 个页面共用 `categories` 的例子，`/api/categories` 理论上只需请求一次，构建时间随之下降。

## 关键前提：相同 key 必须对应相同数据 {#nuxt-3-10-shared-prerender-data-key}

特别强调了一个**重要前提（important prerequisite）**：既然共享是**按 key** 进行的，那么就必须保证：

> **同一个 key，在所有页面里都对应同一份数据。**

这意味着 key 与数据之间要有稳定、可预测的对应关系。

如果你在不同页面里用了相同的 key，却期望它们返回不同的数据，开启 `sharedPrerenderData` 后就会出问题：后续页面会错误地复用第一个页面缓存的结果，导致数据串台。

典型的危险写法是：key 写死成通用名，但实际数据依赖路由参数。

```vue
<script setup lang="ts">
const route = useRoute()

// ⚠️ 危险：key 固定为 'post'，但数据随 id 变化
const { data } = await useAsyncData(
  'post',
  () => $fetch(`/api/posts/${route.params.id}`)
)
</script>
```

正确做法是让 key 随数据的区分维度一起变化：

```vue
<script setup lang="ts">
const route = useRoute()

// ✅ key 包含 id，不同文章对应不同 key
const { data } = await useAsyncData(
  `post:${route.params.id}`,
  () => $fetch(`/api/posts/${route.params.id}`)
)
```

> `useFetch` 会依据请求 URL 等自动生成 key，通常天然满足「相同 URL → 相同数据」。
> 
> 但 `useAsyncData` 的 key 完全由你手动控制，因此手写 key 时更容易踩到「同 key 不同数据」的坑，这也是开启该特性前最需要审查的地方。


内部实现思路：Nuxt 在预渲染过程中维护一份跨页面的数据缓存，以 key 为索引。

当某个页面完成对某 key 的数据获取后，结果被存入这份共享缓存；后续页面在执行 `useAsyncData` / `useFetch` 前，会先检查缓存中是否已有该 key 的数据，命中则跳过实际请求直接返回。

这套机制只作用于**预渲染阶段**，目的是在构建期消除重复的数据获取，而不改变运行时（runtime）的行为。相关实现可参考对应的 [Nuxt PR #24894](https://github.com/nuxt/nuxt/pull/24894)。

## 使用 sharedPrerenderData 的步骤 {#nuxt-3-10-shared-prerender-data-steps}

1. 确认站点使用了**预渲染**，且存在多页面共用同一份数据的场景（导航、分类、全局配置等）。
2. 在 `nuxt.config.ts` 的 `experimental` 中设置 `sharedPrerenderData: true`。
3. 审查所有 `useAsyncData` 的 key：确保**相同 key 一定对应相同数据**。
4. 对依赖路由参数或动态输入的数据，把区分维度（如 `id`）拼进 key。
5. 重新执行预渲染构建，观察重复请求数量与构建时间的下降。
6. 若出现数据串台，优先排查是否存在「同 key 不同数据」的调用。

## 注意事项 {#nuxt-3-10-shared-prerender-data-cautions}

| 事项                          | 说明                                                |
|-------------------------------|-----------------------------------------------------|
| 特性为实验性                  | 位于 `experimental.sharedPrerenderData`，需显式开启 |
| 仅作用于预渲染阶段            | 目的是缩短构建时间，不改变运行时行为                |
| 共享按 key 进行               | 相同 key 会复用同一份缓存数据                       |
| 必须保证 key 与数据一致       | 同 key 不同数据会导致后续页面拿到错误的缓存结果     |
| `useAsyncData` key 需手动把控 | 动态数据要把 `id` 等维度拼进 key                    |
| 适合内容密集型站点            | 页面越多、共用数据越多，收益越明显                  |

`sharedPrerenderData` 的价值在于用一个开关消除预渲染阶段的冗余数据获取，但它把正确性的责任交给了开发者，**只要守住「相同 key 对应相同数据」这条铁律，就能安全地换取更短的构建时间。**