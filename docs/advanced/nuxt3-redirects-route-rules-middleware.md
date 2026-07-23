# Nuxt 3 中实现重定向 {#nuxt-3-redirects-route-rules-middleware}

重定向（Redirect）是 Web 应用中不可或缺的能力。

无论是页面 URL 变更、从旧站点（如 WordPress）迁移到 Nuxt，还是用户书签失效后的引导，都需要重定向来避免死链。

对 SEO 而言，没有重定向意味着搜索引擎权重丢失、收录失效，是致命问题。

在 Nuxt 2 时代，有一个专门的 `@nuxtjs/redirect-module` 模块来处理重定向。

但 Nuxt 3 原生提供了更强大的能力，不再需要额外模块。

下面展示在 Nuxt 3 内置的路由规则（Route Rules）和 Nitro 中间件两种方式，从简单到复杂地实现重定向，并在需要自定义逻辑（如正则替换、动态参数）时优雅扩展。

## 简单重定向：路由规则 {#simple-redirect-route-rules}

最基础的重定向通过 `routeRules` 的 `redirect` 字段配置，写在 `nuxt.config.ts` 中。

比如将 `/old` 重定向到 `/new`，只需一行：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/old': { redirect: '/new' } // [!code ++]
  }
})
```

访问 `/old` 后，浏览器收到 307（Temporary Redirect）状态码并跳转到 `/new`。

**状态码的选择**

默认使用 307 是有意为之的。307 是临时重定向，浏览器不会缓存，方便在测试阶段反复修改规则而不被浏览器缓存误导。

当确定规则稳定、需要 SEO 权重传递时，再切换为 301（永久重定向）。

切换方式是将字符串改为对象，显式指定 `statusCode`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
   routeRules: {
      '/old': {
         redirect: {
            to: '/new',
            statusCode: 301 // [!code ++]
         }
      }
   }
});
```

> 302 也是临时重定向的一种，但 307 保证不改变 HTTP 方法（POST 仍是 POST），而 302 历史上会把 POST 变成 GET。现代实践中，临时重定向推荐 307，永久重定向推荐 301。 [Mastering Nuxt](https://masteringnuxt.com/blog/how-to-redirect-in-nuxt-every-single-way)

## 通配符重定向 {#wildcard-redirect}

实际项目中往往是一批 URL 需要重定向，而非单个。

路由规则支持 `**` 通配符匹配路径后缀：

```ts
export default defineNuxtConfig({
   routeRules: {
      '/old-wildcard/**': {
         redirect: '/new-wildcard/**'
      }
   }
});
```

访问 `/old-wildcard/abc` 会被重定向到 `/new-wildcard/abc`，路径后缀自动透传。

这种写法适合整目录迁移的场景。

通配符重定向同样支持对象形式配置状态码：

```ts
export default defineNuxtConfig({
   routeRules: {
      '/old-wildcard/**': {
         redirect: {
            to: '/new-wildcard/**',
            statusCode: 301 // [!code ++]
         }
      }
   }
});
```

## 路由规则的局限 {#limitations-of-route-rules}

`routeRules` 中的配置必须可序列化（serializable），意味着不能写函数、正则、动态逻辑。

这是 Nuxt 3 与 Nuxt 2 的关键区别，Nuxt 2 的 redirect 模块允许在配置中直接写函数，Nuxt 3 完全禁止。

当遇到需要正则匹配、字符串替换、动态参数处理的复杂场景时，路由规则就不够用了。

这时需要借助 Nitro 的中间件能力。

## 自定义重定向中间件 {#custom-redirect-middleware}

在 Nuxt 的 `server/middleware/` 目录下创建中间件文件，可以编写任意 JavaScript 逻辑，在请求到达 Nuxt 实例之前执行重定向：

```ts
// server/middleware/redirect.ts
export default defineEventHandler(async (event) => {
  // 在此处理复杂重定向逻辑
})
```

比如将旧 URL `/players/abc%231234` 需要重定向到 `/users/abc-1234`，其中 `%23`（编码的 `#`）需要替换为 `-`，路径前缀也要从 `players` 改为 `users`。这种字符串替换在路由规则中无法实现。

**实现思路**：定义一组规则函数，每个函数接收 `event`，返回重定向响应或不返回（表示不匹配）。

中间件按顺序执行规则，命中即返回：

```ts
// server/middleware/redirect.ts
import type { H3Event } from 'h3'

type RedirectRule = (event: H3Event) => Promise<Response | void>

const rules: RedirectRule[] = [
  redirectOldPlayerPage
]

export default defineEventHandler(async (event) => {
  for (const rule of rules) {
    const response = await rule(event)
    if (response) {
      return response
    }
  }
})
```

规则函数的实现：

```ts
// server/middleware/redirect.ts
import { sendRedirect } from 'h3'

async function redirectOldPlayerPage(event: H3Event) {
  const { path } = event

  // 只处理 /players/ 开头的路径
  if (!path.startsWith('/players/')) {
    return
  }

  // 将 %23 替换为 -，将 /players 替换为 /users
  const newPath = path
    .replace(/%23/g, '-')
    .replace('/players', '/users')

  // 避免无限重定向：新旧路径相同时不处理
  if (newPath === path) {
    return
  }

  return sendRedirect(event, newPath, 301)
}
```

访问 `/players/abc%231234` 后，浏览器收到 301 并跳转到 `/users/abc-1234`，正则替换和路径前缀变更全部完成。

**关键 API 说明**

| API / 类型                                  | 来源 | 说明                                                   |
|---------------------------------------------|------|--------------------------------------------------------|
| `H3Event`                                   | `h3` | 事件对象类型，与 `defineEventHandler` 中的参数类型一致 |
| `sendRedirect(event, location, statusCode)` | `h3` | 发送重定向响应，在 Nitro 中自动导入                    |
| `event.path`                                | h3   | 当前请求路径                                           |
| `defineEventHandler`                        | `h3` | 定义事件处理器                                         |

> `sendRedirect` 在 Nitro 中是自动导入的，可以直接使用。
> 
> 如果需要在非 Nitro 环境中使用，需从 `h3` 显式导入。
> 
> H3 是 Nuxt/Nitro 底层的 HTTP 框架，所有事件处理都基于 `H3Event`。 [H3 Routing Docs](https://nitro.build/docs/routing)

## 为什么简单场景仍用路由规则 {#why-use-route-rules-for-simple-cases}

能用路由规则就别用中间件，因为路由规则有几个中间件不具备的优势：

| 对比项          | 路由规则                                                                                               | 中间件                            |
|-----------------|--------------------------------------------------------------------------------------------------------|-----------------------------------|
| 平台原生优化    | 部分平台（Netlify、Vercel、Cloudflare）可将静态重定向规则编译到 CDN 层，在请求到达服务器前就完成重定向 | 每次请求都执行 JS，无法下沉到 CDN |
| 客户端导航支持  | Nuxt 3.8+ 支持客户端导航时也执行路由规则重定向                                                         | 仅服务端执行，客户端导航不触发    |
| Vue Router 集成 | 可注入 Vue Router 层级，SSG/SPA 模式也生效                                                             | 仅在服务端运行时执行              |
| 逻辑复杂度      | 只能配置静态字符串/对象                                                                                | 可写任意函数、正则、异步逻辑      |

## 进阶：从 CMS 动态加载重定向规则 {#dynamic-loading-redirect-rules-from-cms}

中间件中可以执行任意异步操作，包括从 CMS API 拉取重定向规则。

这种场景下应配合缓存使用，避免每次请求都调用 API：

```ts
// server/middleware/redirect.ts
export default defineEventHandler(async (event) => {
  // 从缓存获取重定向规则（defineCachedFunction）
  const redirects = await getRedirectsFromCMS()
  
  const match = redirects.find(r => event.path.startsWith(r.from))
  if (match) {
    return sendRedirect(event, match.to, match.statusCode || 301)
  }
})
```

缓存策略可以使用 `defineCachedFunction` 或 `defineCachedEventHandler`，可以配合 [Nitro 的缓存实现](./nitro-caching-guide.md)。

## 完整重定向方案配置 {#common-cases-complete-redirect-configuration}

以下以一个从旧站点迁移到 Nuxt 的项目为例，展示简单规则与自定义逻辑共存的配置：

1. **简单路径重定向（路由规则）**
   ```ts
   // nuxt.config.ts
   export default defineNuxtConfig({
     routeRules: {
       '/about-us': {
         redirect: { to: '/about', statusCode: 301 }
       }
     }
   })
   ```

2. **通配符目录迁移（路由规则）**
   ```ts
   export default defineNuxtConfig({
      routeRules: {
        '/blog/old/**': {
          redirect: { to: '/blog/new/**', statusCode: 301 }
        }
      }
   });
   ```

3. **复杂参数替换（中间件）**
   ```ts
   // server/middleware/redirect.ts
   import { sendRedirect } from 'h3'
   import type { H3Event } from 'h3'

   async function redirectOldPlayerPage(event: H3Event) {
     const { path } = event
     if (!path.startsWith('/players/')) return
     
     const newPath = path.replace(/%23/g, '-').replace('/players', '/users')
     if (newPath === path) return
     
     return sendRedirect(event, newPath, 301)
   }

   export default defineEventHandler(async (event) => {
     const rules = [redirectOldPlayerPage]
     for (const rule of rules) {
       const response = await rule(event)
       if (response) return response
     }
   })
   ```

4. **从 CMS 动态加载并缓存规则**
   ```ts
   // server/utils/redirects.ts
   export const getRedirects = defineCachedFunction(
     async () => {
       return await $fetch('https://cms.example.com/api/redirects')
     },
     { maxAge: 300, getKey: () => 'redirects-list' }
   )
   ```

5. **验证与部署**
    - 确保使用 `nuxt build`（带服务器运行时）部署，而非纯静态生成
    - 在浏览器中逐一测试重定向路径和状态码
    - 确认 301 规则已在搜索引擎权重传递上生效

## 注意事项 {#notes}

1. **先用 307 再切 301**

   开发阶段用 307（默认），避免浏览器缓存 301 导致测试时拿不到新规则。规则稳定后再切 301。作者反复强调这个顺序。

2. **路由规则配置必须可序列化**

   `nuxt.config.ts` 中的 `routeRules` 不能写函数。需要函数逻辑时必须放到 `server/middleware/` 中的 Nitro 中间件里。

3. **中间件重定向需服务端运行时**

   自定义中间件只在服务端运行时执行。如果使用 `nuxt generate` 做纯静态生成（SSG），中间件代码只在构建时执行，部署后不会生效。路由规则中的静态重定向在 SSG 模式下可以被部分平台编译进静态配置，但自定义逻辑不行。

4. **通配符重定向的平台兼容性**

   Cloudflare、Vercel、Netlify 等平台支持通配符重定向的静态编译。但自建 VPS 或不支持的 CDN 上，通配符重定向可能无法在 CDN 层完成，需要服务器运行时处理。部署前确认平台能力。

5. **避免无限重定向循环**

   自定义规则中务必检查 `newPath === path` 的情况，如果新旧路径相同就跳过，否则会形成无限重定向循环。

6. **规则执行顺序很重要** 

   中间件中多个规则按数组顺序依次执行，用 `for...of` 循环保证优先级。不要用 `Promise.all` 并行执行，并行无法控制优先级，可能导致多个规则同时命中产生冲突。

7. **从 CMS 加载规则务必缓存**

   如果重定向规则来自外部 CMS API，每次请求都调用 API 会严重拖慢响应。使用 `defineCachedFunction` 缓存规则列表，配合合理的 `maxAge` 和手动失效机制。

8. **路由规则在 Nuxt 3.8+ 支持客户端导航**

   从 Nuxt 3.8 开始，路由规则重定向在客户端导航（SPA 路由跳转）时也会生效。如果你的 Nuxt 版本低于 3.8，客户端导航不会触发路由规则重定向，需要额外用路由中间件（`middleware/` 目录下的 Nuxt 中间件）处理。 [Mastering Nuxt](https://masteringnuxt.com/blog/how-to-redirect-in-nuxt-every-single-way)