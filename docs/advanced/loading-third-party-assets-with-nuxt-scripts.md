# Nuxt Scripts 加载第三方资源 {#loading-third-party-assets-with-nuxt-scripts}

几乎每个应用都会引入第三方脚本（third-party scripts）：

Stripe 用于支付、Google Analytics 用于统计、Google Maps、YouTube 嵌入等等。

这些脚本往往带来三类痛点：

- **性能损耗**：脚本通常在首屏即被加载，拖慢首屏渲染，导致总阻塞时间（Total Blocking Time, TBT）升高、首次内容绘制（First Contentful Paint, FCP）变差。
- **隐私与安全**：直接请求第三方源会暴露用户信息，也存在被篡改的风险。
- **开发体验（DX）**：在服务端渲染（SSR）场景下，`useHead` / `useNuxtScript` 虽然能用，但要保证脚本在客户端安全加载、确保加载完成后再调用其 API，逻辑相当繁琐。

[Nuxt Scripts 模块](https://scripts.nuxt.com/)正是为解决这些问题而生。

它是 Nuxt 团队与 Google Chrome Aurora 团队合作的产物，核心目标是让第三方脚本的加载更可控、更安全、类型更友好。

## Nuxt Scripts 能解决什么 {#what-can-nuxt-scripts-do}

模块提供了一整套围绕 `useScript` 的能力，归纳起来有几条主线：

| 能力                          | 说明                                                                                   |
|-------------------------------|----------------------------------------------------------------------------------------|
| 脚本注册表（script registry） | 内置了一批常用脚本（Google Analytics、Clarity、Cloudflare Web Analytics 等），开箱即用 |
| 触发时机控制                  | 可设定 `client`、`manual`、`onNuxtReady`、`server` 等触发方式，避免首屏即加载          |
| 事件代理（proxy）             | 脚本尚未加载时调用其 API，事件不会丢失，会在加载完成后补发                             |
| Facade 组件                   | 为 YouTube、Google Maps 等提供门面组件，点击后才真正加载 iframe                        |
| 自定义脚本支持                | 任意 URL 脚本均可接入，并获得完整类型推断                                              |
| 通过 Nitro 打包               | 可将外部脚本本地化，由 Nitro 统一分发，兼顾隐私与缓存                                  |

得益于延迟加载，首屏的 TBT、FCP、Speed Index 等指标都有明显改善；其中 YouTube 这类重资源的提升最为显著。

## 核心 API：useScript 加载自定义脚本 {#core-api-use-script-to-load-custom-scripts}

被加载的脚本本身很简单：生成一个随机 CSS ID 和随机颜色，然后向页面插入一条 "Nuxt Script is awesome" 的提示，对外暴露一个全局的 `window.run` 函数。

### 基础用法 {#basic-usage}

环境前提：已安装 `@nuxt/scripts`，处于 Nuxt 3.13 且开启了 Nuxt 4 兼容版本（`compatibilityVersion: 4`）。

这一点并非必需，只是演示时为了使用 `app/` 目录更方便；在 Nuxt 3 下逻辑完全一致，只是没有 `app/` 目录。

在 `index.vue` 中通过 `useScript` 加载脚本，并从返回值中解构出所需能力：

```vue
<script setup lang="ts">
// 模板 ref，用于绑定触发元素
const mouseOverElement = ref<HTMLElement | null>(null)

const { load, onLoad, status, displayWidget } = useScript(
  // 注意使用 raw 脚本地址，即真正的 JS 文件
  'https://gist.githubusercontent.com/.../raw.js',
  {
    // 1. 触发时机：鼠标移到元素上时才加载
    trigger: useScriptTriggerElement({
      on: 'mouseover',
      el: mouseOverElement,
    }),
    // 2. use：把脚本暴露的全局函数映射为本地可调用、且类型安全的函数
    use() {
      return {
        // 将 window.run 映射为 displayWidget
        displayWidget: () => window.run(),
      }
    },
  },
)
</script>
```

几个要点：

- `useScript` 既支持注册表脚本（有专门的 `useScriptClarity`、`useScriptCloudflareWebAnalytics` 等封装），也支持 `useScriptNpm` 从 npm 包加载；本例用的是最朴素的「按 URL 加载」方式。
- `use` 选项是关键：它告诉 Nuxt Scripts「这个脚本加载后，会向外提供哪些函数/对象」，从而把这些全局符号映射成本地、可解构、可类型推断的变量。这里脚本对外只有一个 `run` 函数，加载后即存在 `window.run`，因此映射成 `displayWidget`。
- `trigger` 默认是 `server`（onReady，即 Nuxt 就绪时加载）；这里改用 `useScriptTriggerElement`，实现「鼠标 hover 到指定元素上才加载」。

## 类型安全：让 window.run 不再报错 {#type-safety-make-window-run-not-throw-error}

直接写 `window.run` 时，TypeScript 会报错，因为 `Window` 接口上并没有 `run`。

解决办法是用声明合并（declaration merging）扩展全局 `Window` 类型：

```ts
type MyScript = {
  run: () => void
}

declare global {
  interface Window extends MyScript {}
}
```

这样 `window.run` 就有了完整类型。

这也是 Nuxt Scripts 的一个重要收益，即便是任意自定义脚本，也能获得端到端的类型安全。

如果脚本本身是 npm 包，还可以直接随包提供类型，接入更省事。

## onLoad 回调与状态展示 {#onload-callback-and-status-display}

脚本加载是异步的，加载完成后要做的事可以放进 `onLoad`。同时可以把脚本状态渲染到页面上方便观察：

```vue
<template>
  <div ref="mouseOverElement">
    <h1>Load this script please</h1>
  </div>

  <ClientOnly>
    <p>status: {{ status }}</p>
  </ClientOnly>
</template>
```

```ts
onLoad(() => {
  // 脚本加载完成后立即执行一次
  displayWidget()
})
```

`status` 在加载前为 `awaiting load`，表示脚本已就绪但尚未触发加载。用 `ClientOnly` 包裹是因为状态只在客户端有意义。

运行效果：页面初始显示 `awaiting load`；鼠标移到标题上，脚本被加载，`onLoad` 触发，提示随即出现；再次 hover 不会重复加载脚本。硬刷新后颜色会随机变化。

## 手动触发加载：load 与状态判断 {#manual-trigger-load-and-status-check}

上面的 hover 触发只能生效一次。如果希望用按钮反复触发，可以用 `load` 函数手动加载脚本，并结合 `status` 判断当前是否已加载：

```vue
<template>
  <button @click="showWidget">
    Show widget (again)
  </button>
</template>
```

```ts
const showWidget = async () => {
  // 若脚本尚未加载，先等待加载完成
  if (status.value === 'awaiting load') {
    await load()
  }
  // 已加载则直接再次执行
  displayWidget()
}
```

逻辑要点：

- 当 `status.value` 为 `awaiting load` 时，说明脚本还没加载，此时直接调用 `displayWidget()` 不会有任何效果，因为 `window.run` 还不存在；必须先 `await load()`。
- 一旦脚本加载完成，`status` 就不再是 `awaiting load`，之后每次点击都只是再次执行 `run`，不会重复下载脚本。
- 把按钮文案做成条件显示更友好：未加载时显示「Show widget」，已加载后显示「Show widget (again)」。

## 通过 Nitro 打包脚本：兼顾隐私与稳定 {#nitro-bundle-scripts-for-privacy-and-stability}

外部脚本随时可能被修改。Nuxt Scripts 支持在构建时把脚本一并打包，改由 Nitro 提供：

- 脚本不再直接请求原始源，只下载一次并经 Nitro 缓存分发；
- 在隐私与 GDPR 合规方面更有利；
- 除非重新构建，否则脚本内容不会被动到，安全性更高。

## 可执行的常见流程 {#common-executable-flow}

把上述内容浓缩成可复用的步骤：

1. 安装并启用模块：`@nuxt/scripts`，确保 Nuxt 3.13+（Nuxt 4 兼容版本可选）。
2. 用 `useScript(url, options)` 加载脚本，`url` 指向 raw JS 文件地址。
3. 在 `use()` 中映射脚本对外暴露的全局函数，并解构出 `load`、`onLoad`、`status` 及业务函数。
4. 用 `declare global` 扩展 `Window` 类型，补齐类型定义。
5. 通过 `trigger` 控制加载时机：默认 `server`，或用 `useScriptTriggerElement` 绑定元素事件（如 `mouseover`）实现按需加载。
6. 在 `onLoad` 中处理「加载完成后要做的事」；手动场景用 `await load()` + `status` 判断，实现反复触发而不重复下载。
7. 若有隐私/稳定性诉求，开启 Nitro 打包，将脚本本地化分发。

## 注意事项 {#notes}

- `use` 映射出的函数在脚本未加载时调用是无意义的，必须结合 `status` 或 `load` 处理「先加载再执行」的顺序；视频演示中正是踩了这个坑，未 hover 直接点按钮时没有任何反应。
- Facade 组件（YouTube、Google Maps 等）本质上是用静态预览代替真实 iframe，点击后才真正加载，是降低 TBT 的利器。
- 若所需脚本不在注册表中，可以提 issue 请求收录；私有/公司内部脚本则走自定义脚本路径。
- 脚本函数命名不限于 `run`，可以有多个函数，`use` 里一并映射即可，类型同样能推断。
- 注册表脚本接入更省事，类型也最完整；npm 包脚本可随包带类型，DX 最佳。