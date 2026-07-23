# 异步 Composition API 的上下文丢失与四种解法 {#nuxt-instance-unavailable-async-composition-api}

只要在 Nuxt 里大量使用 composables，迟早会撞见这个报错：**Nuxt instance unavailable**。

它通常伴随一个指向官方文档的链接，但链接背后的机制往往被一带而过。

这个错误到底意味着什么？为什么偏偏在异步代码里出现？以及有哪几种修复方式，哪一种最值得用。

核心结论一句话：**问题出在 `await` 之后**。当在一个 composable 或 `setup` 里 `await` 了某个异步操作，之后再去调用依赖 Nuxt 上下文的 composable（如 `useRuntimeConfig`、`useState` 等），Nuxt 就可能已经「找不到」当前实例了，于是抛出该错误。

## 一、错误是怎么被触发的 {#nuxt-instance-unavailable-async-composition-api-trigger}

从一个 demo 应用入手，刻意「弄坏」它来复现错误。

错误写法：先 `await` 一个异步调用，然后在 `await` **之后**再调用需要 Nuxt 实例的 composable：

```ts
// ❌ 会触发 "Nuxt instance unavailable"
async function useSomething() {
  const data = await $fetch('/api/data')   // 先 await
  const config = useRuntimeConfig()         // await 之后再用需要上下文的 composable
  return { data, config }
}

//  ERROR  [unhandledRejection] [nuxt] A composable that requires access to the Nuxt instance was called outside of a plugin, Nuxt hook, Nuxt middleware, or Vue setup function. This is probably not a Nuxt bug. Find out more at https://nuxt.com/docs/4.x/guide/concepts/auto-imports#vue-and-nuxt-composables.
```

表面看逻辑没问题，但正是这个「`await` 在前、上下文相关调用在后」的顺序引爆了错误。

## 二、根因：Vue 如何处理异步 setup / composable {#nuxt-instance-unavailable-async-composition-api-root-cause}

要理解为什么，必须看 Vue 在底层如何维护「当前实例」。核心机制是：

- Vue（以及 Nuxt）依赖一个**同步可访问的「当前实例」上下文**。在 `setup` 同步执行期间，Vue 会把「当前活跃的实例」设为全局可取；composable 内部正是靠读取这个全局状态来拿到实例。
- 但 **`await` 会打断同步执行**。一旦遇到 `await`，函数让出执行权，微任务队列里的其他代码开始运行，Vue 早已把「当前实例」这个全局指针**清空或切走**了。
- 因此 `await` **之后**再调用依赖上下文的 composable，就取不到实例，于是报 "Nuxt instance unavailable"。

一句话概括：**上下文只在第一个 `await` 之前是可靠的**，异步边界之后就丢了。

## 三、四种修复方案 {#nuxt-instance-unavailable-async-composition-api-solutions}

下面给出了四种解法，并对其适用性做了权衡。

### 1、将异步操作放到最后 {#nuxt-instance-unavailable-async-composition-api-solution-1}

最简单直接的做法，**先把所有依赖上下文的 composable 调用完，再做 `await`**。

```ts
// ✅ 上下文相关调用在前，await 在后
async function useSomething() {
  const config = useRuntimeConfig()   // 先取上下文
  const data = await $fetch('/api/data') // 再 await
  return { data, config }
}
```

只要保证异步操作是「最后一步」，就不会在 `await` 之后再触碰上下文。

这是成本最低、最推荐的日常写法。

### 2. 从`useAsyncData`中返回响应 {#nuxt-instance-unavailable-async-composition-api-solution-2}

把异步逻辑包进 `useAsyncData`，让 Nuxt 自己管理上下文与时序。

在 handler 里做请求，Nuxt 会在正确的上下文中调度：

```ts
// ✅ 交给 useAsyncData 管理
function useSomething() {
    return useAsyncData('something', () => {
        const config = useRuntimeConfig()          // ✅ handler 内、await 之前取上下文
        return $fetch('/api/data', {
            baseURL: config.public.apiBase             // 用上下文里的值
        })
    })
}
```

这种方式契合 Nuxt 的数据获取范式，既解决上下文问题，又顺带获得 SSR 去重、缓存等能力。

### 3. `runWithContext` / `callWithNuxt` {#nuxt-instance-unavailable-async-composition-api-solution-3}

当确实无法避免「`await` 之后还要用上下文」时，可以用 Nuxt 提供的 `runWithContext`（或底层的 `callWithNuxt`）**显式地在正确的 Nuxt 上下文里执行**那段代码：

```ts
async function useSomething() {
    const nuxtApp = useNuxtApp()                             // ✅ 必须在任何 await 之前获取
    const data = await $fetch('/api/data')                   // 异步操作打断同步上下文
    const config = await nuxtApp.runWithContext(() => useRuntimeConfig()) // ✅ 在上下文中执行
    return { data, config }
}
```

要点是：**在第一个 `await` 之前**先通过 `useNuxtApp()` 拿到 `nuxtApp` 实例，之后用 `runWithContext` 把上下文「手动接回来」。

这是一种可靠但略显繁琐的显式方案，适合无法调整顺序的复杂场景。

### 4. `asyncContext`（实验性）{#nuxt-instance-unavailable-async-composition-api-solution-4}

最后是治本的方向，开启实验性的 `asyncContext`。它借助底层的 [unctx](https://github.com/unjs/unctx) 与 JavaScript 的 Async Context 提案能力，让上下文**能够跨越 `await` 边界自动保持**：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: {
    asyncContext: true
  }
})
```

开启后，即使在 `await` 之后调用依赖上下文的 composable 也能正确工作，因为运行时会自动追踪并恢复上下文。

它当时仍是**实验性（experimental）**特性，底层依赖运行时对 `async context` 的支持，值得关注但需谨慎用于生产。

## 四、如何选择 {#nuxt-instance-unavailable-async-composition-api-solution-choice}

- **能调整顺序就调整**（方案 1）首选，零依赖零配置。
- **数据获取场景**（方案 2）用 `useAsyncData` 顺理成章。
- **顺序无法调整时**（方案 3）用 `runWithContext` 显式接回上下文。
- **想从根上解决**（方案 4）开启 `asyncContext`，但留意其实验状态。

## 常见案例 {#nuxt-instance-unavailable-async-composition-api-solution-cases}

1. **定位报错来源**：找到那个「`await` 之后仍调用上下文相关 composable」的位置。
2. **优先重排顺序**：把 `useRuntimeConfig`/`useState` 等调用挪到第一个 `await` 之前。
3. **数据请求走 useAsyncData**：用 `useAsyncData('key', () => $fetch(...))` 包裹异步请求。
4. **顺序无法改时用 runWithContext**：`await` 前 `useNuxtApp()` 拿实例，之后 `nuxtApp.runWithContext(...)`。
5. **评估开启 asyncContext**：在 `nuxt.config.ts` 设 `experimental.asyncContext = true` 做根治，但先验证稳定性。
6. **封装 composable 时守规矩**：自定义 composable 内部同样遵循「上下文调用在前、`await` 在后」。

## 注意事项 {#nuxt-instance-unavailable-async-composition-api-solution-notes}

| 事项                              | 说明                                                                   |
|-----------------------------------|------------------------------------------------------------------------|
| **根因是异步边界**                | `await` 会打断同步执行，Vue/Nuxt 的「当前实例」上下文随之丢失。        |
| **上下文只在首个 `await` 前可靠** | 异步操作之后再取上下文就可能失败。                                     |
| **方案 1 最省心**                 | 「上下文调用在前、异步在后」是成本最低的日常写法。                     |
| **runWithContext 要先拿实例**     | 必须在 `await` 之前 `useNuxtApp()`，之后才能 `runWithContext`。        |
| **asyncContext 是实验特性**       | 依赖 unctx 与 Async Context 能力，生产使用需谨慎评估。                 |
| **不止 Nuxt**                     | 这本质是 Vue Composition API 的通用问题，纯 Vue 里也有类似上下文规则。 |

这一「上下文只在同步阶段有效」的规则同样适用于 Vue 的 `inject`、`getCurrentInstance`、生命周期钩子注册（如 `onMounted`），它们都必须在 `setup` 的同步阶段调用，不能放到 `await` 之后。

因此把「同步注册、异步收尾」当作编写 composable 的默认心智模型，能一并规避这一整类问题。

若团队频繁踩坑，可考虑在 ESLint 层面引入相关规则来提前拦截「`await` 后调用上下文 API」的写法。

