# 服务端渲染验证 {#server-side-rendering-verification}

> **摘要**：整站开启 SSR 不代表每块内容都由服务端产出。
> 
> 用 `useNuxtApp`、`data-ssr` 属性和 View Source 三步组合，可以精准定位任何一段内容究竟由服务端还是客户端渲染。

## 为什么"页面 SSR"这个结论不够用 {#why-page-ssr-is-not-enough}

在 Nuxt 3 项目中，即使 `ssr: true`、路由未被 route rules 降级为 SPA，仍会出现"首屏 HTML 里搜不到目标内容"的情况，常见原因包括：

- 组件依赖 `window` / `navigator` / `document` 等浏览器专属 API
- 组件被 `<ClientOnly>` 包裹
- 数据请求写在 `onMounted` 而不是 `useAsyncData` / `useFetch`
- 局部路由被 route rules 设为 `ssr: false`

这些内容不会出现在服务器返回的 HTML 里，对 SEO、爬虫抓取、首屏可见性都是隐性损耗。


### 一、先判断整站是否开启 SSR {#check-if-ssr-is-enabled}

打开 DevTools → Console，输入：

```js
window.useNuxtApp().isHydrating
// 或直接查看 SSR 上下文
window.useNuxtApp()
```

返回 `true` 说明当前页由服务端渲染进入，且未被 route rules 排除。

> `window.useNuxtApp` 是 Nuxt 3 暴露到浏览器的调试入口，仅用于开发排查，生产环境需注意其安全性。


### 二、用 `data-ssr` 属性做目视校验 {#check-ssr-with-data-ssr}

Nuxt 会在根渲染节点上打标记：

```html
<div id="__nuxt" data-ssr="true">...</div>
```

- `data-ssr="true"` → 服务端渲染
- `data-ssr="false"` → 客户端渲染

在 Elements 面板 `Ctrl/Cmd + F` 搜索 `data-ssr="true"` 即可确认。这是不打开 Console 时的替代方案。

### 三、终极方法：View Page Source + 全文搜索 {#view-page-source}

这是最可靠的一招：**能在"查看网页源代码"里搜到的文本，才是真正的 SSR 产物。**

操作步骤：

1. 页面右键 → **View Page Source**（快捷键 `Ctrl/Cmd + U`）
2. 这份 HTML 是浏览器最初从服务器拿到的响应，尚未经过 hydration
3. `Ctrl/Cmd + F` 搜索目标文本片段


## 开发环境同样适用 {#check-ssr-in-dev}

View Source 这套方法在 `nuxt dev` 本地开发环境就能用，不需要等部署到线上。

SSR 排查因此可以前置到编码阶段，而不是上线后才发现内容"消失"。

## 实战技巧 {#practical-tips} 

1. Console 执行 `window.useNuxtApp()`，确认整站 SSR 已开启
2. Elements 面板搜索 `data-ssr="true"`，快速目视校验
3. 右键 → **View Page Source**，`Ctrl+F` 搜索目标文案
4. 搜得到 = SSR；搜不到 = CSR
5. 对搜不到的组件，检查是否依赖 `window` / `navigator`、是否被 `<ClientOnly>` 包裹
6. 数据类内容额外确认是否用了 `useAsyncData` / `useFetch` 而非 `onMounted`
7. 全流程在开发环境即可完成，无需等待生产部署


## 常见坑与注意事项 {#common-pitfalls}

- **不要用 Elements 面板判断 SSR**：Elements 展示的是 hydration 之后的 DOM，早已被 JS 修改。**只有 View Source 反映首屏 HTML 的真实内容。**
- **异步数据放错位置**：`onMounted` 里发的请求永远只在客户端执行，View Source 里必然搜不到，需要改用 `useAsyncData` / `useFetch`。
- **`<ClientOnly>` 是刻意降级**：搜不到不一定是 bug，先确认是否为业务上的主动选择。
- **爬虫视角 ≈ View Source 视角**：SEO 需要的内容必须出现在首屏 HTML 里，否则搜索引擎抓不到。
- **进阶技巧**（来自评论区）：把 View Source 的 HTML 复制粘贴到 Elements 面板，可以在可视化视图下检查服务端产出的结构；或直接用浏览器的"另存为 HTML"打开保存后的文件，效果等同。
- **route rules 局部覆盖**：某个子路由若配置了 `ssr: false`，整站 SSR 判断为 `true` 也无济于事，需在 `nuxt.config.ts` 的 `routeRules` 中确认。


**原视频**：[YouTube - Is your content actually server-rendered!?](https://www.youtube.com/watch?v=b1euj4dg3Sw) 