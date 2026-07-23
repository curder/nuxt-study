# Nuxt 中代理后端 API 的正确方式 {#the-best-way-to-proxy-api-in-nuxt}

Nuxt 中代理（proxy）后端 API 的四种方案，逐一验证它们在客户端、SSR 与运行时环境变量三大标准下的表现，最终得出唯一全满足的做法：用 Nitro catch-all 路由 + `proxyRequest`。

在真实项目里，前端经常需要把 `/api/*` 的请求转发（proxy）到某个后端 API，以此绕开跨域（CORS）的麻烦，同时对外隐藏真实后端地址。

这个需求看似简单，但在 Nuxt 里却是个「老大难」，官方仓库里有一条存在了两年多、积累了 20 多条评论和 60 多条回复的 GitHub 讨论，各种方案鱼龙混杂：有的已经过时，有的其实从未真正跑通。

把问题拆成了**三条必须同时满足的验收标准**，用它们来逐一「拷问」每种方案：

| 编号 | 验收标准   | 说明                                           |
|----|--------|----------------------------------------------|
| 1  | 客户端可用  | 在浏览器端 fetch `/api/users` 能拿到正确 JSON          |
| 2  | SSR 可用 | 服务端渲染（SSR）时代理同样生效                            |
| 3  | 运行时可配置 | 代理目标 URL 能通过环境变量/runtimeConfig 在运行时切换，无需重新构建 |

演示用的 demo 极简：一个空的 `nuxt.config`，一个 `app.vue`，里面用 `useFetch('/api/users')` 拉数据，目标是把它代理到 `https://jsonplaceholder.typicode.com` 的 `/users`。

## 方案一：Vite Server Proxy 只能在开发客户端用 {#vite-server-proxy}

第一种思路是借助 Vite 的 `server.proxy` 配置：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    server: {
      proxy: {
        '/api': {
          target: 'https://jsonplaceholder.typicode.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})
```

其中 `changeOrigin` 强制改写请求来源，`rewrite` 用正则把开头的 `/api` 去掉，避免它被拼接到目标 URL 上。

先在 `useFetch` 上设 `server: false`（只在客户端跑），浏览器里一切正常，标准 1 通过。

但一旦把 `server` 改回 `true`（默认值即 SSR），页面就会**超时或 socket 挂起（socket hang up）**。

原因很直接：**Vite 的 `server.proxy` 本质是 dev server proxy，压根不是为 SSR 设计的**，服务端渲染时它无法工作。

而且它也没法用 runtimeConfig 配置。三条标准里只过了第一条，淘汰。

## 方案二：Nitro devProxy 同样卡在 SSR {#nitro-devproxy}

既然 Vite 不行，那试试 Nitro 自带的 `devProxy`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    devProxy: {
      '/api': {
        target: 'https://jsonplaceholder.typicode.com',
        changeOrigin: true
        // 注意：这里没有 rewrite 选项
      }
    }
  }
})
```

和 Vite 相比，`devProxy` **没有 `rewrite` 选项**。客户端（`server: false`）依然正常，但切到 SSR 后又是熟悉的「加载很久」后失败。

> 当使用 `$fetch` / `useFetch` 调用**自己应用内部的相对路径 API**（如 `/api/users`）时，Nitro 不会真的发出一个 HTTP 请求，而是直接**模拟（emulate）**这次调用。

Nitro 看到相对 URL，就认定这是内部调用，于是「跳过网络、直接运行对应的处理函数」。这对调用真实存在的内部 API 是一种省时优化，但在代理场景下根本没定义 `/api/users` 这个端点，它绕过了 devProxy，也就没有任何东西被执行。标准 2 不通过。

## 方案三：Route Rules proxy 静态 URL 的最佳选择 {#route-rules-proxy}

继续留在 Nitro 生态里，下一个选项是 **route rules**（路由规则）的 `proxy`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/api/**': {
      proxy: 'https://jsonplaceholder.typicode.com/**'
    }
  }
})
```

两个细节：用 `/api/**` 匹配所有子路径，目标里用 `/**` 把子路径原样映射过去。

这次不仅客户端正常，通过「查看网页源代码（View Page Source）」还能确认数据**确实被服务端渲染进了 HTML**，标准 1 和标准 2 双双通过，这是前两种方案从未做到的。

但卡在了第三条：route rules 的值必须是**可序列化（serializable）**的静态配置，没法在里面调用 `useRuntimeConfig()`，也不能塞入运行时才确定的值。

**如果你的代理目标是一个永不改变的静态 URL，route rules 就是最优解**，简洁且客户端/SSR 都工作。但只要涉及「运行时切换 URL」的需求，就得进入终极方案。

## 方案四（终极解）：Nitro Catch-all 路由 + `proxyRequest` {#nitro-catch-all-proxy}

要同时满足三条标准，唯一可行的做法是**直接用 Nitro 写一个 catch-all API 路由**手动代理。

首先在 `server/` 下建一个 catch-all 文件：

```ts
// server/api/[...].ts
export default defineEventHandler(async (event) => {
  // 1. 拿到运行时配置里的代理 URL
  const { myProxyUrl } = useRuntimeConfig(event)

  // 2. 处理 path：去掉开头的 /api
  const path = event.path.replace(/^\/api/, '')

  // 3. 拼接目标地址（joinURL 来自 ufo，会自动处理多余的斜杠）
  const target = joinURL(myProxyUrl, path)

  // 4. 代理请求
  return proxyRequest(event, target)
})
```

对应的 `nuxt.config.ts` 里声明 runtimeConfig：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    myProxyUrl: 'https://jsonplaceholder.typicode.com'
    // 默认值可留空，交给环境变量决定
    // 运行时用 NUXT_MY_PROXY_URL 覆盖
  }
})
```

几个关键点，特别点了名：

- **`useRuntimeConfig()` 在 server 路由里能用，是少数例外。** 「server 目录里不要用 Vue composable」，但 `useRuntimeConfig` 例外因为它不只是 Vue composable，Nitro 自身也实现了一个同名函数。这里用的其实是 Nitro 版本，无需 import，名字只是「恰好一样」以对应相同用途。
- **`proxyRequest` 来自 h3。** 它是 Nitro 底层框架 h3（原文口播 "A3/H3"）暴露的 helper，接收 `event` 和 `target` 两个参数，且被自动导入（auto-import），无需手写 import。h3 还提供 `proxyRequestHeaders` 等其他 helper，可在 h3 的 JS docs 里查到。
- **`joinURL` 来自 `ufo`。** 它能优雅处理尾部斜杠拼接问题。虽然它随 Nitro 一起可用、不写进 `package.json` 也能 import，但建议还是把它显式加入依赖，做好依赖管理。

这套方案客户端正常、`View Page Source` 确认 SSR 生效，而且构建后只要修改环境变量指向另一个 API / 服务器 / URL，代理立刻切换三条标准**全部通过**。

## 常见案例 {#common-cases}

1. **纯客户端 SPA、无 SSR** → Vite `server.proxy` 或 Nitro `devProxy` 够用，但仅限开发调试。
2. **需要 SSR 且代理目标是固定静态 URL** → 直接用 `routeRules` 的 `proxy`，最省事。
3. **需要 SSR 且目标 URL 要按环境（staging / QA / 生产）在运行时切换** → 上 Nitro catch-all 路由 + `proxyRequest`。
4. 在 catch-all 路由里，务必用 `useRuntimeConfig(event)` 读取目标 URL，而不是 `process.env`。
5. 用正则 `path.replace(/^\/api/, '')` 剥掉前缀，再用 `joinURL` 拼接，避免斜杠问题。
6. 运行时通过 `NUXT_MY_PROXY_URL` 这类环境变量覆盖，无需重新构建。

## 注意事项 {#important}

| 细节                                | 说明                                                              |
|-----------------------------------|-----------------------------------------------------------------|
| 内部相对路径不会真正发请求                     | `$fetch('/api/..')` 会被 Nitro 模拟执行，从而绕过 devProxy，这是方案二 SSR 失败的根因 |
| Vite `server.proxy` 不支持 SSR       | 它只是 dev server proxy，SSR 下会 socket hang up                      |
| route rules 必须可序列化                | 无法在其中使用 `useRuntimeConfig`，故不支持运行时动态 URL                        |
| 别用 `process.env` 配代理 URL          | 它只在构建时求值，运行时改动不生效（与 runtimeConfig 那期视频同理）                       |
| `useRuntimeConfig` 是 server 端合法例外 | 因为 Nitro 自身也实现了同名函数，而非纯 Vue composable                          |
| `proxyRequest` / `joinURL` 自动导入   | 分别来自 h3 与 ufo，无需手动 import，但 ufo 建议写进依赖                          |

> 手动代理时若后端依赖 `Host`、`Origin` 或鉴权头，注意 `proxyRequest` 默认会转发大部分请求头，必要时可结合 h3 的 `proxyRequestHeaders` 做过滤或改写；
> 
> 对需要携带 cookie 的场景，也要确认目标服务端的 CORS 与 `credentials` 策略。

## 延伸阅读

- [Nuxt 官方 server 文档](https://nuxt.com/docs/getting-started/server)
- [Nitro 官方文档](https://nitro.build/)
- [h3 仓库](https://github.com/unjs/h3)
- [ufo 仓库](https://github.com/unjs/ufo)