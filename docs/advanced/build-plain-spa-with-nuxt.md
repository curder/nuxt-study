# 用 Nuxt 构建纯客户端 SPA {#build-plain-spa-with-nuxt}

一提到 Nuxt，很多人第一反应就是"服务端渲染（Server-Side Rendering，SSR）框架"。

但事实上，Nuxt 完全可以用来构建传统的单页应用（Single Page Application，SPA），一个不需要服务器、所有逻辑都跑在一份 HTML 文件里的纯客户端应用，和用原生 Vue（Bare Vue）写出来的效果一样。

问题是：默认配置下跑 `nuxt generate`，Nuxt 会把所有路由都预渲染（prerender）成静态 HTML，这并不是真正的 SPA。

那么该如何彻底关闭渲染、只保留一份 HTML？为什么在能用纯 Vue 的情况下，还值得用 Nuxt 来做 SPA？

## 默认 generate 的问题 {#default-generate-issue}

先看一个最小 Demo：几个预生成页面，`index` 首页、`about` 关于页、以及一个动态页 `users/[name]`，页面之间用 `<NuxtLink>` 互相跳转。

`nuxt.config` 也很简单，只设置了黑底白字。

直接运行静态站点生成（Static Site Generation，SSG）：

```bash
pnpm generate
```

结果 Nuxt 预渲染了 **10 条路由**，输出里有 `payload.json`（带 build hash）、`users`、`about`、`users/test` 等一堆静态文件。

查看 `output/public/about/index.html`，里面实实在在写着 "about page" 的内容，这显然不是 SPA，而是一堆预渲染好的静态页。

## 1. 关闭 SSR {#disable-ssr}

要变成纯客户端应用，第一件事就是在 `nuxt.config` 里关闭服务端渲染：

```ts
export default defineNuxtConfig({
  ssr: false,
})
```

`ssr: false` 是彻底禁用 SSR 唯一需要的配置。再次运行 `pnpm generate`，会看到一条警告：

> HTML content not prerendered because `ssr: false` was set.

**很多错误教程让人"为了做静态生成而设 `ssr: false`"，这是错的**。

如果你要的是带 SEO、构建时就渲染好内容的 SSG，应该把 `ssr` 设为 `true`（或直接删掉该选项，因为默认就是 `true`）。

而现在我们要的正是纯 SPA，所以这条警告恰恰是预期行为，不用担心。

此时预渲染路由从 10 条降到 **5 条**：`index`、`about`、`404`、`200` 等还在，但整个 `users` 及其动态子路由 `users/[name]`、`users/test` **完全消失了**。

原因是：`ssr: false` 后生成的 HTML 里只有一个加载占位（loading spinner），没有任何真实链接，Nuxt/Nitro 内置的爬虫（crawler）自然爬不到动态页面的链接，于是不再生成它们。

这正是我们想要的。顺带一提，那个加载占位可以通过 SPA loading template 自定义，本例未设置。

## 2. 清空预渲染路由 {#clear-prerendered-routes}

`ssr: false` 之后仍有个小遗憾：`index`、`about` 这类静态页依然会被生成。

如果有上百个静态页，构建会变慢。

这里有两种取舍：

- **保留静态页生成**：好处是可以通过 `nuxt.config` 为每页预渲染不同的 meta 标签；
- **只要一份 HTML**：那就需要用一个 Nuxt 钩子（hook）清空待渲染路由。

实现"只留一份 HTML"的技巧是挂到 `prerender:routes` 钩子上，把待预渲染的路由集合清空：

```ts
export default defineNuxtConfig({
  ssr: false,
  hooks: {
    'prerender:routes'({ routes }) {
      routes.clear() // 不生成除默认之外的任何路由
    },
  },
})
```

其中 `routes` 是钩子上下文里的一个路由字符串集合（Set），`clear()` 直接清空。再次生成后，路由降到只剩 **3 条必要项**：`index.html`、`404`、`200`，而且内容完全一致。

这样部署就非常灵活：

- 支持 `404.html` / `200.html` 约定的平台（如 Netlify 等）会自动识别，把所有请求都指向它；
- 自建 VPS 时，配置 Nginx 或 Apache 始终返回 `index.html`（或 `200`/`404`，因为它们都一样）即可，任何路径都回退到这份 HTML。

## 3. 验证确实是 SPA {#verify-spa}

生成后可以用最简单的方式本地预览：

```bash
npx serve output/public
```

打开 `localhost:3000`，检查 `index.html` 的负载信息可以确认：`server rendered` 为 `false`、`data ISR` 为 `false`，说明内容并非服务端渲染，一切符合 SPA 预期。

刷新页面会看到短暂闪烁（flickering），因为 HTML 里本就没有预渲染内容。

## 4. 启用路由 Hash 模式 {#enable-hash-mode}

如果你连 Nginx/Apache 的回退规则都不想配，只想要一份纯粹的单文件 SPA，可以用 Vue Router 支持的片段路由（fragment / hash based routing）。

Nuxt 里配置也很简单：

```ts
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      hashMode: true,
    },
  },
})
```

`hashMode: true` 让 Vue Router 使用 hash 模式。

构建并本地预览后，URL 会带上 `#` 前缀，跳转到关于页就是形如 `localhost:3000/#/about` 的地址。

Hash 模式的好处是：**服务器只需提供 `index.html` 一个文件**，路由切换全在客户端通过 URL 片段完成，不需要任何服务端 rewrite 规则。

刷新页面很快，且能看到 `index.html` 里确实没有任何预渲染内容。

## 常见案例 {#common-cases}

可把整套流程浓缩为可执行步骤：

1. 在 `nuxt.config` 里设 `ssr: false`，彻底关闭服务端渲染。
2. 运行 `pnpm generate`，确认动态路由已不再被爬虫生成（看到 `ssr: false` 警告属正常）。
3. 如需极致精简，用 `prerender:routes` 钩子 `routes.clear()`，把输出压到只剩 `index.html` / `404` / `200`。
4. 部署时二选一：平台/服务器统一回退到 `index.html`；或直接开 `router.options.hashMode: true` 走 hash 路由，只托管单文件。
5. 用 `npx serve output/public` 本地预览，检查负载中 `server rendered: false` 确认是纯客户端渲染。

一份"单文件 + hash 路由"的完整最小配置示例：

```ts
export default defineNuxtConfig({
  ssr: false,
  router: {
    options: {
      hashMode: true,
    },
  },
  hooks: {
    'prerender:routes'({ routes }) {
      routes.clear()
    },
  },
})
```

## 为什么用 Nuxt 而不是纯 Vue？{#why-nuxt-not-bare-vue}

既然纯 Vue 也能做 SPA，为什么还要用 Nuxt？核心理由是**"演进空间"与"开箱即用的实现"**：

- **项目会长大**：一开始可能只是小型 SPA，但一旦需求变成"某些页面要 SSR"或"要几张预渲染的营销页"，纯 Vue 就得自己搭 SSR 或整体迁移到 Nuxt，前者坑很多，而这些坑 Nuxt 团队已经替你踩平。用 Nuxt 起步，后续通过路由规则（route rules）就能对不同页面选择 SSR、SSG、SPA 等模式。
- **内置能力**：文件系统路由（file-system based routing）、自动导入（auto imports）等，在纯 Vue 里得靠 `unplugin-vue-router`、`unplugin-auto-import` 等自己拼装并自行维护；Nuxt 把这些做成了内置体验。
- **拥有实现 vs. 拥有便利**：自己搭固然能完全掌控依赖和实现，出问题也得自己扛；想要"全套内置体验"，Nuxt 更省心，还能用上其模块生态。
- **随时加后端**：需要 API 路由时，Nitro 已经在那里等着，能平滑补上后端能力。

用不用 Nuxt 做 SPA，很大程度上是偏好、项目走向和团队熟悉度的问题，纯 Vue 同样完全可行。

而且在 Nuxt 里照常写普通 Vue 代码也毫无障碍。

## 注意事项 {#cautions}

- **`ssr: false` ≠ 静态生成的正确姿势**：反复强调，想要带 SEO 的构建时渲染，应该用 `ssr: true`（默认值），别被错误教程误导。`ssr: false` 只用于纯 SPA。
- **那条预渲染警告是预期的**：设 `ssr: false` 后出现 "HTML content not prerendered" 属正常，不是错误。
- **动态页消失是设计使然**：因为无 SSR 的 HTML 里没有链接，爬虫抓不到动态路由，所以不会生成，这正是 SPA 想要的行为。
- **静态页仍会生成**：仅设 `ssr: false` 时，静态页照旧预渲染；页面很多时构建会变慢，用 `prerender:routes` + `routes.clear()` 才能压到单文件。
- **部署要处理路由回退**：非 hash 模式下，务必让服务器把所有路径回退到 `index.html`，否则刷新子路由会 404。用 hash 模式则天然规避这个问题。
- **补充经验，SPA 的 SEO 短板**：纯客户端渲染对搜索引擎和社交分享预览不友好，因此它最适合登录后台、内部工具这类无需 SEO 的场景；若个别页面需要 SEO，考虑用路由规则做混合渲染，而非全站 SPA。
- **补充经验，首屏闪烁可优化**：SPA 首次加载会有空白/闪烁，建议自定义 SPA loading template 提供加载态，改善首屏体验。