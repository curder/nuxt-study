# Vue 3.4 更易调试的 Hydration 错误与 useId {#vue-3-4-improved-hydration-errors-and-useid}

Vue 3.4 中被低估的 SSR 改进：hydration 不匹配错误现在会精确定位到具体 DOM 元素与组件，还能在生产环境开启，并引出 `useId` 解决 UI 库的 ID 一致性难题。

Vue 3.4 发布时，大家的目光都集中在稳定版 `defineModel` 宏、快两倍的单文件组件（SFC）解析器、更高效的响应式系统，以及 `v-bind` 简写上。

但有一个和服务端渲染（SSR）密切相关的改进几乎无人提及——**hydration（水合）错误的可调试性大幅提升**。

对于纯单页应用（SPA）来说这不是问题，但只要你用了 SSR，就绕不开 hydration。而那句臭名昭著的报错：

```
Hydration completed but contains mismatches
```

在过去几乎等于「大海捞针」——它只告诉你出了不匹配，却不告诉你是哪个组件、哪个元素。

## 什么是 Hydration，以及不匹配从何而来 {#what-is-hydration-and-where-does-mismatch-come-from}

**Hydration** 指的是：SSR 时服务端先把组件渲染成 HTML 发给浏览器，客户端再「接管」这份静态 HTML、绑定事件与响应式逻辑，让它变成可交互的应用。

这个「接管」过程要求**客户端渲染出的结构必须与服务端发来的 HTML 完全一致**，一旦对不上，就是 hydration mismatch。

一个极小的 demo 复现：通过一个「生成随机链接」的函数造出 10 条随机链接并渲染成列表。

```vue
<script setup lang="ts">
  type Link = { name: string, link: string };
  let list = ref<Link[]>([])
  // 每次执行都会产生不同的随机字符
  list.value = generateMultipleLinks()

  function generateMultipleLinks(): Link[] {
    const links: Link[] = [];

    for (let i = 0; i < 10; i++) {
      const link = generateLink();
      links.push({
        name: `data ${i}`,
        link,
      })
    }
    return links;
  }

  function generateLink(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 10;
    let link = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      link += characters.charAt(randomIndex);
    }
    return `https://example.com/${link}`;
  }
</script>

<template>
  <ul>
    <li v-for="link in list" :key="link.link">
      <NuxtLink :to="link.link">{{ link.name }}</NuxtLink>
    </li>
  </ul>
</template>
```

问题的根源在于：**`<script setup>` 在服务端和客户端各执行一次**。

由于生成的是随机值（randomness），服务端算出的链接（比如以 `zk8ray` 开头）和客户端重新算出的（比如以 `d1tg` 开头）必然不同。

页面加载瞬间会有一次「信息闪烁（flash）」——正是服务端 HTML 被客户端的不同结果替换所致，控制台随即抛出那句 mismatch 报错。

> 这类问题在 Vue 2 里同样存在，根源类似于 `created` 钩子中执行不可预测逻辑。
> 
> 凡是**在渲染期依赖随机数、`Date.now()`、`localStorage`、时区、`window` 等「两端不一致」的来源**，都可能触发 hydration 不匹配。

### 1. 使用 useAsyncData {#use-async-data}

useAsyncData 会把服务端生成的数据写入 Nuxt payload。客户端 hydration 时读取 payload，而不是重新生成一次。

```vue
<script setup lang="ts">
type Link = {
  name: string
  link: string
}

const { data: list } = await useAsyncData<Link[]>(
  'random-links',
  async () => generateMultipleLinks()
)

function generateMultipleLinks(): Link[] {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `data ${index}`,
    link: generateLink(),
  }))
}

function generateLink(): string {
  const characters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let value = ''

  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    value += characters.charAt(randomIndex)
  }

  return `https://example.com/${value}`
}
</script>

<template>
  <ul>
    <li v-for="item in list ?? []" :key="item.link">
      <NuxtLink :to="item.link">
        {{ item.name }}
      </NuxtLink>
    </li>
  </ul>
</template>
```

这里的 `random-links` 是缓存键。在同一页面上使用多个类似组件时，每个组件应当使用不同且稳定的键，否则可能共享同一份数据。

### 2. 使用 `useState` {#use-state}

对于可以直接序列化到 Nuxt payload 的简单状态，也可以使用 `useState`：

```vue
<script setup lang="ts">
type Link = {
  name: string
  link: string
}

const list = useState<Link[]>(
  'random-links',
  () => generateMultipleLinks()
)

function generateMultipleLinks(): Link[] {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `data ${index}`,
    link: generateLink(),
  }))
}

function generateLink(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let value = ''

  for (let i = 0; i < 10; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    value += characters[randomIndex]
  }

  return `https://example.com/${value}`;
}
</script>

<template>
  <ul>
    <li v-for="item in list" :key="item.link">
      <NuxtLink :to="item.link">
        {{ item.name }}
      </NuxtLink>
    </li>
  </ul>
</template>
```

`useState` 的初始化函数通常在服务端执行，结果会被序列化并传到客户端，因此 hydration 阶段能够复用相同的数组。

需要注意，`useState` 是按键共享的状态。如果该组件可能出现多次，固定键 `random-links` 会让多个组件实例共享列表。这种情况下，可以让父组件传入稳定的 ID：

```ts
const props = defineProps<{
  id: string
}>()

const list = useState<Link[]>(
  `random-links:${props.id}`,
  generateMultipleLinks
)
```

### 3. 使用 `<ClientOnly>` {#client-only}

如果这些随机链接不需要出现在服务端 HTML 中，可以明确关闭这一部分的 SSR：

```vue
<script setup lang="ts">
type Link = {
  name: string
  link: string
}

const list = ref<Link[]>([])

onMounted(() => {
  list.value = generateMultipleLinks()
})

function generateMultipleLinks(): Link[] {
  return Array.from({ length: 10 }, (_, index) => ({
    name: `data ${index}`,
    link: generateLink(),
  }))
}

function generateLink(): string {
  const characters =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let value = ''

  for (let i = 0; i < 10; i++) {
    value += characters[
      Math.floor(Math.random() * characters.length)
    ]
  }

  return `https://example.com/${value}`
}
</script>

<template>
  <ClientOnly>
    <ul>
      <li v-for="item in list" :key="item.link">
        <NuxtLink :to="item.link">
          {{ item.name }}
        </NuxtLink>
      </li>
    </ul>

    <template #fallback>
      <p>正在加载链接……</p>
    </template>
  </ClientOnly>
</template>
```

这种方案不会发生 hydration mismatch，因为服务端并未渲染随机列表。但代价是失去这部分内容的 SSR，可能影响首屏表现和 SEO。


### 4. 不仅使用 `import.meta.client` {#import-meta-client}

下面这种写法虽然避免服务端执行随机函数，却仍可能造成服务端和客户端首次渲染结构不同：

```ts
if (import.meta.client) {
  list.value = generateMultipleLinks()
}
```

服务端渲染空列表，而客户端 hydration 时直接渲染十个列表项，结构仍不一致。

若采用客户端生成，应在 `onMounted()` 中生成，并最好配合 `<ClientOnly>` 明确表达客户端渲染意图。

对于这个组件，优先使用 `useAsyncData` 或 `useState`；只有随机链接完全不需要 SSR 时，才选择 `<ClientOnly>`。

## Vue 3.3 vs 3.4：报错信息对比 {#vue-3-3-vs-3-4-error-message-difference}

在 **Vue 3.3** 下，只能看到那句笼统的 `Hydration completed but contains mismatches`——在一个几百个组件的大型应用里，这几乎无法定位。

升级到 **Vue 3.4** 后，同样的代码给出的信息丰富得多：

```
Hydration text mismatch in <a> ...
  - rendered on server: 16mp...
  - expected on client: 1ehn...
  at <NuxtLink>
```

关键提升有三点：

| 维度    | Vue 3.3 | Vue 3.4                         |
|-------|---------|---------------------------------|
| 不匹配类型 | 仅笼统提示   | 明确是 text / attribute 等          |
| 出错位置  | 无       | 具体 DOM 元素（如 `<a>`）+ 服务端/客户端各自的值 |
| 关联组件  | 无       | 指出渲染它的组件（如 `<NuxtLink>`）        |

它虽然还没直接点名「哪个组件文件」，但已经告诉你出错的 DOM 元素、两端各自渲染出的值，以及外层组件，定位效率大幅提升。

## 生产/预发环境开启 hydration 检查 {#enable-hydration-check-in-production-or-staging}

hydration 错误最棘手之处在于：它们常常**只在生产环境出现**（受缓存、特定条件等影响），dev 模式反而复现不出来。

而过去**没有办法在生产环境启用**这些 hydration 警告。

Vue 3.4 通过一个**编译期标志（compile-time flag）**解决了这一点，而在 Nuxt 中更简单——只需在 `nuxt.config` 里把 `debug` 设为 `true`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  debug: true // 在 staging / QA 环境开启 hydration mismatch 警告
})
```

这样就能在预发 / QA 环境拿到珍贵的 hydration 不匹配警告与错误，把「只在生产复现」的幽灵问题提前暴露。

## useId：UI 库 ID 一致性的最终解法 {#useid-final-solution-for-ui-library-id-consistency}

Vue 3.4 因为**新增了对属性（attribute）的 hydration 检查**，顺带暴露出一批过去「碰巧能跑」的隐藏问题。

属性检查此前非常昂贵，一直没做，所以很多不一致「靠巧合」从未被发现；如今检查到位，问题浮出水面。

其中一类典型问题来自 UI 库（Headless UI、Tailwind、Radix Vue 等）。

这些库需要**为每个元素生成唯一 ID**，但难点在于：Vue 此前没有提供一个官方的 `useId` 组合式函数来生成**在服务端和客户端保持一致**的唯一 ID。

ID 两端对不上，自然触发 hydration 不匹配。

围绕这个缺口的进展：

- Nuxt 侧早在 2023 年 9 月就有了 `useId` 的提案（PR）。
- 但更理想的是由 **Vue 本身**提供，这样库作者无需分别适配 Nuxt、`vite-ssr-plugin` 等各种 SSR 方案。
- Nuxt 团队的 Daniel Roe 还给出过基于 `v-bind` + `useHydration` 的过渡替代方案，可在两端工作。

这意味着一个能服务整个生态的统一方案即将到来——不仅库作者受益，任何需要稳定唯一 ID 的实现都能用上。

## 常见案例：排查与规避 hydration 不匹配 {#common-cases-troubleshooting-and-avoiding-hydration-mismatch}

1. 升级到 **Vue 3.4+**，让报错直接给出出错 DOM 元素、两端的值和所属组件。
2. 在 Nuxt 里设 `debug: true`，在 staging / QA 提前捕获只在生产出现的 hydration 问题。
3. 排查时优先怀疑渲染期的**不确定来源**：随机数、时间、时区、`window` / `localStorage`。
4. 若必须用随机值，把生成结果放到 `useState` 或 payload 中，保证两端复用同一份数据。
5. UI 库相关的 ID 不匹配，等待 / 采用 `useId`（Vue 3.5 官方版），过渡期可用 Nuxt 的 `useId` 或 `v-bind` 方案。
6. 对确实无法两端一致的内容，用 `<ClientOnly>` 包裹，避免参与服务端渲染。

## 注意事项 {#notes}

| 事项                  | 说明                                         |
|---------------------|--------------------------------------------|
| mismatch 根因是两端渲染不一致 | `<script setup>` 服务端、客户端各执行一次，随机/时间等来源会不一致 |
| 只升级版本即可获得更好报错       | 3.4 无需改代码，报错信息即大幅细化                        |
| 生产环境可开启检查           | 靠编译期标志；Nuxt 中设 `debug: true`               |
| 3.4 新增属性检查          | 会暴露过去「碰巧能跑」的 UI 库 ID 问题，属正常现象              |
| `useId` 计划在 3.5     | 官方统一方案，解决 SSR 下唯一 ID 一致性                   |

并非所有 mismatch 都要靠 `useId` 或关闭 SSR 解决。对「时间显示」这类场景，推荐服务端与客户端统一用 UTC 渲染、待 hydration 完成后再转本地时区；

对第三方脚本注入的 DOM，则用 `<ClientOnly>` 隔离，是更稳妥的通用手段。

## 延伸阅读 {##further-reading}

- [Vue 3.4 发布公告](https://blog.vuejs.org/posts/vue-3-4)
- [Nuxt 3.9 发布公告](https://nuxt.com/blog/v3-9)
- [Vue useId RFC 讨论](https://github.com/vuejs/rfcs)
- [Vue.js Amsterdam 大会](https://vuejs.amsterdam)