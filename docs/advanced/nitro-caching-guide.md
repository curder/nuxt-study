# Nitro 缓存机制 {#nitro-caching-guide}

Nitro 作为 Nuxt 的服务端引擎，也用于 Analog、SolidStart 等框架。

它的核心能力之一就是缓存，让昂贵的计算或 API 调用结果被复用，避免每次请求都重复执行。

但缓存配置往往面临几个痛点：

- 配置文件中的路由规则无法写函数，无法自定义缓存键；
- 生产环境中难以手动清除过期缓存；
- 不同环境（开发 / 生产）可能需要不同的存储后端。

从最简单的路由规则缓存讲起，逐步深入到 `defineCachedEventHandler`、`defineCachedFunction` 和生产环境的缓存失效，覆盖了 Nitro 缓存从入门到进阶的完整链路。

## 路由规则缓存：maxAge 与 SWR {#route-rules-caching}

最基础的缓存方式是在 `nitro.config.ts`（或 Nuxt 的 `nuxt.config.ts`）中通过 `routeRules` 配置：

```ts
// nitro.config.ts
export default defineConfig({
  routeRules: {
    '/api/test': {
      cache: {
        maxAge: 10,   // 缓存 10 秒
        swr: false    // 关闭 stale-while-revalidate
      }
    }
  }
})
```

**maxAge 行为**：首次请求执行 handler 返回结果并缓存；10 秒内再次请求直接返回缓存；10 秒后缓存失效，下一次请求重新执行 handler。如果 handler 内有耗时操作（如 `await new Promise(resolve => setTimeout(resolve, 3000))`），缓存过期后的那个用户就要等待 3 秒。

**SWR 行为**：开启 `swr: true` 后，缓存过期时不再让用户等待，先返回旧数据（stale），同时在后台异步重新获取并更新缓存（revalidate）。后续用户就能拿到新数据。用户永远不会遇到等待延迟，代价是至少有一个用户会拿到稍旧的数据。

```ts
routeRules: {
  '/api/test': {
    cache: {
      maxAge: 10,
      swr: true
    }
  }
}
```

**staleMaxAge**：如果旧数据"太旧"也不应该返回，可以设置 `staleMaxAge`。例如设为 30 秒，意味着缓存超过 30 秒后就不再返回旧数据，用户必须等待重新获取：

```ts
cache: {
  maxAge: 10,
  swr: true,
  staleMaxAge: 30  // 超过 30 秒强制刷新，不返回旧数据
}
```

## `defineCachedEventHandler`细粒度缓存控制 {#using-definecachedeventhandler-for-fine-grained-caching}

路由规则的局限在于配置必须可序列化，无法写函数、无法动态决定缓存键。`defineCachedEventHandler` 解决了这个问题，它将缓存逻辑直接写在 handler 中：

```ts {7-11}
// server/api/test.ts
export default defineCachedEventHandler(
  async (event) => {
    await new Promise(resolve => setTimeout(resolve, 3000))
    return { date: new Date().toISOString() }
  },
  {
    maxAge: 10,
    staleMaxAge: 30,
    getKey: event => event.path  // 基于路径生成缓存键
  }
)
```

第二个参数是缓存选项对象，支持路由规则中的所有字段，并额外支持：

| 选项     | 说明                   | 示例                         |
|----------|------------------------|------------------------------|
| `getKey` | 动态生成缓存键的函数   | `(event) => event.path`      |
| `base`   | 自定义缓存存储命名空间 | `'cache-important'`          |
| `group`  | 缓存分组名             | `'handlers'` / `'functions'` |
| `name`   | 缓存条目名称，默认`_`  | `'_'`                        |
| `vary`   | 响应头变化时区分缓存   | `['accept']`                 |

`getKey` 也可以返回静态字符串：

```ts
getKey: () => 'test-cache'
```

## 缓存键的结构 {#cache-key-structure}

理解缓存键的组成对调试和手动失效至关重要。缓存键由多个部分拼接而成：

```
.nuxt/cache/nitro/handlers/<name>/<getKey>.json
```

各部分含义：

- `nitro`：固定前缀
- `handlers`：分组名。handler 缓存默认为 `handlers`，`defineCachedFunction` 缓存为 `functions`，路由规则缓存为 `routes`。可通过 `group` 选项自定义
- `<name>`：handler 名称。如果函数有名字则用函数名；`export default` 导出的匿名函数则为 `_`
- `<getKey结果>`：`getKey` 函数返回值，`/`会被过滤

例如设置 `getKey: () => 'test-cache'` 后，缓存文件路径为：

```
node_modules/.nitro/cache/nitro/handlers/_test-cache.json
```

缓存文件内容是一个 JSON，包含完整的响应信息：

```json
{
   "expires": 1234567900,
   "value": {
      "code": 200,
      "headers": {
         "cache-control": "..."
      },
      "body": "..."
   },
   "mtime": 1234567890,
   "integrity": "..."
}
```

## 自定义缓存存储后端 {#custom-cache-storage-backend}

默认缓存存在本地文件系统。

如果要切换到 Redis、Cloudflare KV、Vercel KV 等外部存储，通过 `nitro.config.ts` 的 `storage` 配置：

```ts
// nitro.config.ts
export default defineConfig({
  storage: {
    cache: {
      base: 'nuxt4', // 缓存前缀
      driver: 'redis',           // 或 cloudflare-kv 等
      url: 'redis://localhost:6379'
    }
  }
})
```

也可以为缓存指定自定义的 base 名称，然后在 storage 中分别配置：

```ts
// handler 中
export default defineCachedEventHandler(handler, {
  base: 'cache-important',
  maxAge: 10
})

// nitro.config.ts
export default defineConfig({
  storage: {
    'cache-important': {
      base: 'nuxt4', // 缓存前缀        
      driver: 'redis',
      url: 'redis://...'
    }
  }
})
```

开发环境可以用 `devStorage` 指定不同的存储后端，方便本地调试：

```ts
export default defineConfig({
  storage: {
    'cache-important': {
      base: 'nuxt4', // 缓存前缀
      driver: 'redis',
      url: 'redis://production-redis:6379'
    }
  },
  devStorage: {
    'cache-important': {
      driver: 'fs',              // 开发环境用文件系统
      base: './.data/cache'
    }
  }
})
```

## `defineCachedFunction`缓存可复用函数 {#definecachedfunction-caching-reusable-functions}

有时不需要缓存整个 handler，而是缓存一个被多处调用的工具函数。

`defineCachedFunction` 就是函数级别的缓存：

```ts
// server/utils/post.ts
export const getPosts = defineCachedFunction(
  async (postNumber: number) => {
    return await $fetch(`https://jsonplaceholder.typicode.com/posts/${postNumber}`)
  },
  {
    maxAge: 60,
    getKey: (postNumber) => `post-${postNumber}`,
    base: 'cache-important'
  }
)
```

在 handler 中直接调用，同一个缓存键会共享缓存结果：

```ts
// server/api/post.ts
export default defineEventHandler(async (event) => {
  const post = await getPosts(1)  // 首次调用会请求 API，之后命中缓存
  return post
})
```

调用时可以传入 `event` 参数，这在 Edge 运行时中尤其重要，因为 Edge 使用基于 fetch 的事件循环而非 Node.js 的 request/response 模型，需要通过 `event.waitUntil` 确保后台 revalidation 完成后才关闭 worker：

```ts
export const getPosts = defineCachedFunction(
  async (event: H3Event, postNumber: number) => { ... },
  {
    maxAge: 60,
    getKey: (event, postNumber) => `post-${postNumber}`
  }
)
```

即使不直接使用 `event`，传入它也有利于运行时兼容性。

如果确定不用，可以用下划线前缀忽略：`async (_event, postNumber) => { ... }`。

## 缓存失效：手动删除缓存条目 {#cache-invalidation}

开发环境可以直接删除 `.nitro/cache` 文件夹或重启服务器来清缓存。

生产环境则需要通过 `useStorage` 编程式删除。

**原理**：缓存存储在 `useStorage('cache')` 中（或自定义 base 对应的 storage），键名就是前面分析的缓存键路径。

用 `getItem` 检查、`removeItem` 删除：

```ts
// server/api/invalidate-cache.ts
export default defineEventHandler(async (event) => {
  const cache = useStorage('cache')

  // 缓存键：与 defineCachedEventHandler 中 group/name/getKey 对应
  const cacheKey = 'nitro:handlers:_:test-cache'

  const hasItem = await cache.hasItem(cacheKey)
  if (hasItem) {
    await cache.removeItem(cacheKey)
    return { success: true, message: 'Cache invalidated' }
  }
  return { success: false, message: 'Cache entry not found' }
})
```

> 缓存键中的分隔符可以用斜杠 `/` 或冒号 `:`，两者在大多数存储驱动中可以互换。
> 冒号在某些文件系统中更安全，因为斜杠会被解释为目录分隔符。
> 例如 `nitro:handlers:_:test-cache` 等价于 `nitro/handlers/_/test-cache`。

生产环境的缓存失效需要一些额外工作：

- 需要手动拼出正确的缓存键（基于 `group`、`name`、`getKey`）
- 失效接口应该加权限验证（如 API Secret），防止恶意调用清空所有缓存
- 可以搭配 Webhook、定时任务或管理界面触发

只要 `useStorage` 配置正确连接到生产环境的缓存服务（Redis、KV 等），删除操作就能直接生效，无需重启服务。

## 为第三方 API 调用搭建完整缓存方案 {#caching-third-party-api}

以下以缓存 JSONPlaceholder API 为例，展示从函数缓存到手动失效的完整流程：

1. **创建带缓存的工具函数**
   ```ts
   // server/utils/post.ts
   export const getPost = defineCachedFunction(
     async (postNumber: number) => {
       return await $fetch(`https://jsonplaceholder.typicode.com/posts/${postNumber}`)
     },
     {
       maxAge: 60,
       swr: true,
       staleMaxAge: 300,
       getKey: (postNumber) => `post-${postNumber}`,
       group: 'functions',
       name: 'getPost'
     }
   )
   ```

2. **在 handler 中调用**
   ```ts
   // server/api/post.ts
   export default defineEventHandler(async () => {
     const post = await getPost(1)
     return post
   })
   ```

3. **配置生产环境缓存存储**
   ```ts
   // nitro.config.ts
   export default defineConfig({
     storage: {
       cache: {
         base: 'nuxt4', // 缓存前缀
         driver: 'redis', // 缓存驱动
         url: process.env.REDIS_URL // 缓存连接方式
       }
     }
   })
   ```

4. **创建带鉴权的缓存失效接口**
   ```ts
   // server/api/invalidate-post.ts
   export default defineEventHandler(async (event) => {
     const authHeader = getHeader(event, 'authorization')
     if (authHeader !== `Bearer ${process.env.CACHE_SECRET}`) {
       throw createError({ statusCode: 401, message: 'Unauthorized' })
     }

     const postNumber = getQuery(event).id
     const cacheKey = `nitro:functions:getPost:post-${postNumber}`

     const cache = useStorage('cache')
     const hasItem = await cache.hasItem(cacheKey)
     if (hasItem) {
       await cache.removeItem(cacheKey)
       return { success: true, invalidated: cacheKey }
     }
     return { success: false, message: 'Not found' }
   })
   ```

5. **通过 Webhook 或手动调用触发失效**
   ```bash
   curl -X DELETE "https://your-app.com/api/invalidate-post?id=1" \
     -H "Authorization: Bearer your-secret"
   ```

## 注意事项

1. **路由规则中自定义响应头会被丢弃**
   使用缓存后，handler 中设置的响应头默认不会被保留。如果需要按特定请求头区分缓存，必须设置 `vary` 选项。作者强调这是容易踩的坑。

2. **SWR 的数据不是实时的**
   SWR 模式下，缓存过期后第一个命中的用户拿到的是旧数据。如果业务要求严格实时（如价格、库存），不应使用 SWR。

3. **缓存键拼错会导致失效失败**
   手动失效缓存时，键名必须与 `group`、`name`、`getKey` 的组合完全一致。建议在缓存失效接口中先调用 `hasItem` 确认键存在，避免静默失败。

4. **开发与生产环境缓存分离**
   开发环境用文件系统（`devStorage`），生产环境用 Redis/KV（`storage`），避免本地测试污染生产缓存数据。

5. **defineCachedFunction 的缓存键需包含参数**
   如果函数有参数，`getKey` 必须把参数纳入键的生成逻辑，否则不同参数的调用会共享同一个缓存结果，返回错误数据。

6. **Edge 运行时需要传入 event**
   `defineCachedFunction` 中如果可能运行在 Edge 环境（Cloudflare Workers 等），调用时应传入 `event` 参数，让框架通过 `event.waitUntil` 确保后台 revalidation 完成。即使当前不用也建议传入，保证运行时兼容性。

7. **失效接口务必鉴权**
   缓存失效接口能直接删除缓存条目，如果不加鉴权，攻击者可以反复清空缓存导致后端被打满。至少使用 API Secret 或 Basic Auth 保护。

8. **缓存不是免费的**
   缓存会占用存储空间（尤其是 Redis/KV）。设置合理的 `maxAge` 和 `staleMaxAge`，避免不必要的数据长期占用存储。对于低频访问的数据，考虑是否真的需要缓存。