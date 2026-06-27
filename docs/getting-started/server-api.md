# 服务器 api {#server-api}

在 Nuxt 中，构建一个 [Server API](https://nuxt.com/docs/guide/directory-structure/server) 可以通过 `server/api` 目录来实现。

Server API 允许在 Nuxt 应用内部创建服务器端接口，用来处理后端逻辑，例如读取请求参数、处理表单提交、连接数据库、调用第三方服务、做权限校验等。

Nuxt 3 的服务端能力基于 Nitro，因此在编写 Server API 时，建议优先使用 Nitro / h3 提供的工具函数，例如 `defineEventHandler`、`getQuery`、`readBody`、`getValidatedQuery`、`readValidatedBody`、`createError`、`setResponseStatus` 等。

## 创建 Server API 路由 {#creating-server-api-routes}

### 创建 `server/api` 目录 {#creating-server-api-directory}

在 Nuxt 项目的根目录下创建 `server/api` 目录：

```text{3,4}
my-nuxt4-app/
├── server/
│   ├── api/
│   │   └── hello.ts
├── pages/
│   └── index.vue
├── nuxt.config.ts
└── package.json
```

建议 Server API 文件使用 TypeScript，即 `.ts` 文件，而不是 `.js` 文件。这样可以在请求参数、请求体、返回值和业务逻辑中获得更好的类型提示与类型安全。

### 创建一个 API 路由文件 {#creating-api-route-file}

在 `server/api` 目录下创建一个 API 路由文件，例如 `hello.ts`：

```ts
// server/api/hello.ts
export default defineEventHandler(() => {
  return {
    message: 'Hello, world!'
  }
})
```

在这个示例中：

- `defineEventHandler` 用于定义一个事件处理器，处理传入的请求并返回响应。
- `server/api/hello.ts` 会自动映射为 `/api/hello`。
- 返回的普通对象会被 Nuxt / Nitro 自动序列化为 JSON。

### 访问 API 路由 {#accessing-api-route}

通过 `<http://localhost:3000/api/hello>` 访问这个 API 路由，得到的响应将是：

```json
{
  "message": "Hello, world!"
}
```

## 在客户端使用 API {#using-api-in-client}

### 使用 `useFetch` 获取 API 数据 {#using-usefetch-to-get-api-data}

可以在页面或组件中使用 `useFetch` 钩子来获取 API 数据：

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>{{ message }}</h1>

    <p v-if="pending">Loading...</p>
    <p v-if="error">Failed to load data.</p>
  </div>
</template>

<script setup lang="ts">
const { data, pending, error } = await useFetch('/api/hello')

const message = computed(() => data.value?.message ?? '')
</script>
```

在这个示例中：

- `useFetch` 用于从 `/api/hello` 获取数据。
- `pending` 表示请求是否正在进行。
- `error` 表示请求是否失败。
- `data.value` 中保存服务端返回的数据。

如果希望增强类型提示，可以为返回值定义类型：

```vue
<script setup lang="ts">
interface HelloResponse {
  message: string
}

const { data, pending, error } = await useFetch<HelloResponse>('/api/hello')
</script>
```

这样在访问 `data.value?.message` 时，编辑器可以提供更准确的类型提示。

## 创建更复杂的 API 路由 {#creating-more-complex-api-routes}

可以创建更复杂的 API 路由，包括处理请求参数、请求体、动态路由参数、响应状态码、错误处理和权限校验等。

### 处理请求参数 {#handling-query-parameters}

可以使用 `getQuery` 读取 URL query 参数：

```ts
// server/api/greet.ts
export default defineEventHandler((event) => {
  const { name } = getQuery(event)

  return {
    message: `Hello, ${name || 'world'}!`
  }
})
```

通过 `<http://localhost:3000/api/greet?name=Nuxt>` 访问这个 API 路由，得到的响应将是：

```json
{
  "message": "Hello, Nuxt!"
}
```

不过，`getQuery` 只负责读取参数，不负责类型校验。实际项目中不建议直接信任 query 参数，尤其是当参数会参与数据库查询、权限判断或业务计算时，应使用 `getValidatedQuery` 做输入验证。

### 使用 `getValidatedQuery` 校验请求参数 {#using-getvalidatedquery}

在 Nitro 中，推荐使用 `getValidatedQuery` 配合 `zod` 或 `valibot` 对 query 参数进行类型安全校验。

以 `zod` 为例，先安装依赖：

```bash
pnpm add zod
```

然后创建带校验的 API：

```ts
// server/api/greet.get.ts
import { z } from 'zod'

const querySchema = z.object({
  name: z.string().min(1).max(50).optional()
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, querySchema.parse)

  return {
    message: `Hello, ${query.name ?? 'world'}!`
  }
})
```

在这个示例中：

- `getValidatedQuery` 会读取并校验 query 参数。
- `querySchema.parse` 用于执行 `zod` 校验。
- `name` 必须是字符串，并且长度在 1 到 50 之间。
- 如果参数不符合规则，接口会返回错误响应，而不是继续执行后续业务逻辑。

这比直接使用 `getQuery` 更安全，也更适合生产环境。

### 处理请求体 {#handling-request-body}

可以使用 `readBody` 读取 POST、PUT、PATCH 等请求中的请求体：

```ts
// server/api/echo.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  return {
    message: `You said: ${body.message}`
  }
})
```

可以向 `<http://localhost:3000/api/echo>` 发送一个 POST 请求，并在请求体中包含 JSON 数据：

```json
{
  "message": "Hello, API!"
}
```

响应将是：

```json
{
  "message": "You said: Hello, API!"
}
```

不过，和 `getQuery` 类似，`readBody` 只负责读取请求体，不负责校验数据格式。实际项目中更推荐使用 `readValidatedBody`。

### 使用 `readValidatedBody` 校验请求体 {#using-readvalidatedbody}

在处理用户提交的数据时，应使用 `readValidatedBody` 配合 `zod` 或 `valibot` 对请求体做校验。

```ts
// server/api/echo.post.ts
import { z } from 'zod'

const bodySchema = z.object({
  message: z.string().min(1).max(200)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  return {
    message: `You said: ${body.message}`
  }
})
```

在这个示例中：

- `readValidatedBody` 会读取并校验请求体。
- `message` 必须是字符串。
- `message` 不能为空，并且最多 200 个字符。
- 如果请求体不符合规则，请求会被提前拦截。

这是 Nitro Server API 中处理输入数据的推荐方式。

### 使用 `valibot` 校验请求体 {#using-valibot-to-validate-request-body}

除了 `zod`，也可以使用 `valibot` 做输入验证。

安装依赖：

```bash
pnpm add valibot
```

示例：

```ts
// server/api/contact.post.ts
import * as v from 'valibot'

const contactSchema = v.object({
  email: v.pipe(v.string(), v.email()),
  content: v.pipe(v.string(), v.minLength(1), v.maxLength(1000))
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, (value) => v.parse(contactSchema, value))

  return {
    success: true,
    email: body.email,
    message: 'Contact message received.'
  }
})
```

在这个示例中：

- `email` 必须是合法邮箱格式。
- `content` 必须是 1 到 1000 个字符的字符串。
- 校验逻辑集中在 schema 中，便于维护和复用。

## HTTP 方法限定路由 {#http-method-specific-routes}

Nuxt / Nitro 支持通过文件名约定限制 API 路由的 HTTP 方法。

例如：

```text
server/
└── api/
    ├── hello.get.ts
    ├── hello.post.ts
    ├── user.put.ts
    └── user.delete.ts
```

### 创建只响应 GET 请求的 API {#creating-get-only-api}

```ts
// server/api/hello.get.ts
export default defineEventHandler(() => {
  return {
    message: 'This route only handles GET requests.'
  }
})
```

这个文件会映射为：

```text
GET /api/hello
```

### 创建只响应 POST 请求的 API {#creating-post-only-api}

```ts
// server/api/hello.post.ts
import { z } from 'zod'

const bodySchema = z.object({
  name: z.string().min(1).max(50)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  return {
    message: `Hello, ${body.name}!`
  }
})
```

这个文件会映射为：

```text
POST /api/hello
```

也就是说，`hello.post.ts` 只用于处理 POST 请求，而不会处理 GET 请求。

### 常见 HTTP 方法文件名 {#common-http-method-filenames}

常见的 HTTP 方法限定文件名包括：

```text
server/api/example.get.ts
server/api/example.post.ts
server/api/example.put.ts
server/api/example.patch.ts
server/api/example.delete.ts
```

建议在实际项目中优先使用这种文件名约定，而不是在同一个 API 文件中手动判断 `event.node.req.method`。这样路由职责更清晰，也更符合 Nuxt / Nitro 的约定式开发风格。

## 动态路由参数 {#dynamic-route-parameters}

Server API 也支持动态路由参数。

例如创建用户详情接口：

```text
server/
└── api/
    └── users/
        └── [id].get.ts
```

示例代码：

```ts
// server/api/users/[id].get.ts
import { z } from 'zod'

const idSchema = z.coerce.number().int().positive()

export default defineEventHandler((event) => {
  const rawId = getRouterParam(event, 'id')
  const id = idSchema.parse(rawId)

  return {
    id,
    name: `User ${id}`
  }
})
```

访问 `<http://localhost:3000/api/users/1>` 时，响应示例：

```json
{
  "id": 1,
  "name": "User 1"
}
```

在这个示例中：

- `[id].get.ts` 表示动态路由。
- `getRouterParam(event, 'id')` 用于读取路由参数。
- `z.coerce.number()` 可以将字符串形式的 `id` 转为数字。
- `int().positive()` 用于确保 `id` 是正整数。

动态路由参数同样不应直接信任，建议始终进行类型转换和合法性校验。

## 错误处理与状态码 {#error-handling-and-status-code}

在 Server API 中，可以使用 `createError` 抛出标准错误响应。

```ts
// server/api/users/[id].get.ts
import { z } from 'zod'

const idSchema = z.coerce.number().int().positive()

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]

export default defineEventHandler((event) => {
  const rawId = getRouterParam(event, 'id')
  const id = idSchema.parse(rawId)

  const user = users.find((item) => item.id === id)

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return user
})
```

在这个示例中：

- 当用户不存在时，使用 `createError` 返回 404。
- 不建议直接返回 `{ error: 'xxx' }` 作为错误处理方式。
- 使用标准 HTTP 状态码有利于客户端统一处理错误。

如果是创建资源，可以使用 `setResponseStatus` 设置响应状态码：

```ts
// server/api/posts.post.ts
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const post = {
    id: Date.now(),
    title: body.title,
    content: body.content
  }

  setResponseStatus(event, 201)

  return {
    post
  }
})
```

在这个示例中：

- 创建成功后返回 201 状态码。
- `setResponseStatus(event, 201)` 明确表达“资源已创建”。

## 路由中间件 {#server-middleware}

除了 `server/api`，Nuxt 还支持通过 `server/middleware` 创建服务端中间件。

中间件适合处理横切逻辑，例如：

- 鉴权。
- 日志记录。
- 统计请求耗时。
- 注入请求上下文。
- 统一设置响应头。
- 对部分 API 做访问限制。

### 创建服务端中间件 {#creating-server-middleware}

目录结构示例：

```text
my-nuxt4-app/
├── server/
│   ├── api/
│   │   └── admin/
│   │       └── profile.get.ts
│   └── middleware/
│       └── auth.ts
├── pages/
│   └── index.vue
├── nuxt.config.ts
└── package.json
```

示例代码：

```ts
// server/middleware/auth.ts
export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  if (!url.pathname.startsWith('/api/admin')) {
    return
  }

  const authorization = getHeader(event, 'authorization')
  const config = useRuntimeConfig(event)

  if (authorization !== `Bearer ${config.apiToken}`) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  event.context.auth = {
    role: 'admin'
  }
})
```

在这个示例中：

- 中间件会在 API 路由处理前执行。
- 只有 `/api/admin` 开头的接口会触发鉴权逻辑。
- 鉴权失败时抛出 401 错误。
- 鉴权成功后，将用户信息写入 `event.context.auth`，后续 API 可以读取。

### 在 API 中读取中间件注入的上下文 {#reading-context-from-middleware}

```ts
// server/api/admin/profile.get.ts
export default defineEventHandler((event) => {
  return {
    profile: {
      role: event.context.auth?.role ?? 'guest'
    }
  }
})
```

在实际项目中，可以在中间件中解析用户 token，并将用户 ID、角色、权限等信息写入 `event.context`，从而避免在每个 API 中重复写鉴权逻辑。

## 使用运行时配置 {#using-runtime-config}

Server API 中不应直接把密钥、数据库连接字符串、第三方 API Token 等敏感信息写死在代码里。推荐使用 Nuxt 的 `runtimeConfig`。

在 `nuxt.config.ts` 中配置：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiToken: process.env.API_TOKEN,
    public: {
      siteName: 'My Nuxt App'
    }
  }
})
```

在 Server API 中读取：

```ts
// server/api/config-demo.get.ts
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)

  return {
    hasApiToken: Boolean(config.apiToken),
    siteName: config.public.siteName
  }
})
```

在这个示例中：

- `runtimeConfig.apiToken` 只在服务端可用。
- `runtimeConfig.public.siteName` 可以在客户端和服务端使用。
- 敏感配置应放在非 `public` 字段下。

## 组合一个更完整的 CRUD 示例 {#complete-crud-example}

下面是一个更接近真实项目的文章接口示例，包含方法限定、请求体验证、动态路由参数和错误处理。

目录结构：

```text
server/
└── api/
    └── posts/
        ├── index.get.ts
        ├── index.post.ts
        └── [id].get.ts
```

### 获取文章列表 {#get-post-list}

```ts
// server/api/posts/index.get.ts
const posts = [
  {
    id: 1,
    title: 'Nuxt Server API',
    content: 'Introduction to Nuxt Server API.'
  },
  {
    id: 2,
    title: 'Nitro Best Practices',
    content: 'Using validation and method-specific routes.'
  }
]

export default defineEventHandler(() => {
  return {
    posts
  }
})
```

### 创建文章 {#create-post}

```ts
// server/api/posts/index.post.ts
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(5000)
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const post = {
    id: Date.now(),
    title: body.title,
    content: body.content
  }

  setResponseStatus(event, 201)

  return {
    post
  }
})
```

### 获取文章详情 {#get-post-detail}

```ts
// server/api/posts/[id].get.ts
import { z } from 'zod'

const idSchema = z.coerce.number().int().positive()

const posts = [
  {
    id: 1,
    title: 'Nuxt Server API',
    content: 'Introduction to Nuxt Server API.'
  },
  {
    id: 2,
    title: 'Nitro Best Practices',
    content: 'Using validation and method-specific routes.'
  }
]

export default defineEventHandler((event) => {
  const rawId = getRouterParam(event, 'id')
  const id = idSchema.parse(rawId)

  const post = posts.find((item) => item.id === id)

  if (!post) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Post not found'
    })
  }

  return {
    post
  }
})
```

在这个 CRUD 示例中：

- `index.get.ts` 用于获取列表。
- `index.post.ts` 用于创建资源。
- `[id].get.ts` 用于获取详情。
- 所有用户输入都经过校验。
- 创建资源时返回 201。
- 资源不存在时返回 404。

## 客户端提交数据 {#submitting-data-from-client}

可以在页面中使用 `$fetch` 向 Server API 提交数据。

```vue
<!-- pages/posts/create.vue -->
<template>
  <form @submit.prevent="submit">
    <input v-model="title" placeholder="Title" />
    <textarea v-model="content" placeholder="Content" />

    <button type="submit">Create Post</button>

    <p v-if="message">{{ message }}</p>
  </form>
</template>

<script setup lang="ts">
const title = ref('')
const content = ref('')
const message = ref('')

async function submit() {
  try {
    const response = await $fetch('/api/posts', {
      method: 'POST',
      body: {
        title: title.value,
        content: content.value
      }
    })

    message.value = 'Post created successfully.'
    console.log(response)
  } catch (error) {
    message.value = 'Failed to create post.'
    console.error(error)
  }
}
</script>
```

在这个示例中：

- `$fetch` 适合在事件处理函数中主动发起请求。
- `useFetch` 更适合在页面加载或组件初始化时获取数据。
- 客户端可以做基础表单校验，但服务端仍然必须做最终校验。

## Server API 最佳实践 {#server-api-best-practices}

### 优先使用 TypeScript {#prefer-typescript}

建议所有 Server API 文件都使用 `.ts`：

```text
server/api/hello.ts
server/api/users/[id].get.ts
server/api/posts/index.post.ts
```

TypeScript 可以帮助你在开发阶段发现类型错误，并提升代码可维护性。

### 不要直接信任客户端输入 {#do-not-trust-client-input}

不要直接信任以下数据：

- query 参数。
- route params。
- request body。
- headers。
- cookies。

推荐做法：

```ts
const query = await getValidatedQuery(event, querySchema.parse)
const body = await readValidatedBody(event, bodySchema.parse)
```

客户端提交的数据只能作为“未验证输入”，必须在服务端再次校验。

### 使用 HTTP 方法限定文件名 {#use-method-specific-files}

推荐：

```text
server/api/users.get.ts
server/api/users.post.ts
server/api/users/[id].put.ts
server/api/users/[id].delete.ts
```

不推荐把所有方法都写在一个文件中：

```ts
// 不推荐
export default defineEventHandler((event) => {
  if (event.node.req.method === 'GET') {
    // ...
  }

  if (event.node.req.method === 'POST') {
    // ...
  }
})
```

方法拆分后，每个文件只负责一种请求，代码更清晰，也更容易测试。

### 使用标准 HTTP 状态码 {#use-standard-http-status-codes}

常见状态码：

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

示例：

```ts
throw createError({
  statusCode: 404,
  statusMessage: 'Resource not found'
})
```

创建资源时：

```ts
setResponseStatus(event, 201)
```

### 使用 `runtimeConfig` 管理配置 {#use-runtime-config}

敏感配置不要写死在代码中，也不要放在 `public` 字段下。

推荐：

```ts
const config = useRuntimeConfig(event)
const apiToken = config.apiToken
```

不推荐：

```ts
const apiToken = 'hard-coded-token'
```

### 统一处理鉴权逻辑 {#centralize-authentication}

如果多个 API 都需要鉴权，推荐放在 `server/middleware` 中统一处理，而不是在每个 API 文件中重复写同样的代码。

适合放在中间件中的逻辑：

- 检查 token。
- 解析用户身份。
- 注入 `event.context.user`。
- 校验访问路径。
- 记录请求日志。

### 避免返回敏感信息 {#avoid-returning-sensitive-information}

接口响应中不要返回：

- 密码。
- token。
- session secret。
- 数据库连接信息。
- 内部错误堆栈。
- 第三方服务密钥。

错误响应应尽量简洁：

```ts
throw createError({
  statusCode: 500,
  statusMessage: 'Internal server error'
})
```

不要把内部错误对象完整返回给客户端。

### 保持接口返回结构稳定 {#keep-response-structure-stable}

建议接口返回结构保持稳定，例如：

```ts
return {
  data: {
    id: 1,
    name: 'Alice'
  }
}
```

或者：

```ts
return {
  success: true,
  data: {
    id: 1,
    name: 'Alice'
  }
}
```

不要在同一个接口中有时返回对象、有时返回字符串、有时返回数组。稳定的数据结构有利于客户端维护。

### 为复杂逻辑拆分 service 层 {#split-service-layer-for-complex-logic}

当 API 逻辑变复杂时，不建议把所有业务代码都写在路由文件中。可以将业务逻辑拆到 `server/services` 中。

目录示例：

```text
server/
├── api/
│   └── users/
│       └── [id].get.ts
└── services/
    └── user.ts
```

示例：

```ts
// server/services/user.ts
export async function getUserById(id: number) {
  return {
    id,
    name: `User ${id}`
  }
}
```

在 API 中调用：

```ts
// server/api/users/[id].get.ts
import { z } from 'zod'
import { getUserById } from '../../services/user'

const idSchema = z.coerce.number().int().positive()

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, 'id')
  const id = idSchema.parse(rawId)

  const user = await getUserById(id)

  return {
    user
  }
})
```

这样可以让 API 路由只负责请求处理，让 service 层负责业务逻辑。

## 推荐目录结构 {#recommended-directory-structure}

一个较完整的 Nuxt Server API 目录结构可以参考：

```text
my-nuxt4-app/
├── server/
│   ├── api/
│   │   ├── hello.get.ts
│   │   ├── greet.get.ts
│   │   ├── echo.post.ts
│   │   ├── posts/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   └── [id].get.ts
│   │   └── admin/
│   │       └── profile.get.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── services/
│       └── user.ts
├── pages/
│   ├── index.vue
│   └── posts/
│       └── create.vue
├── nuxt.config.ts
└── package.json
```

这个结构中：

- `server/api` 用于定义 API 路由。
- `server/middleware` 用于定义服务端中间件。
- `server/services` 用于放置业务逻辑。
- API 文件使用 `.get.ts`、`.post.ts` 等方法限定命名。
- 输入校验集中在 API 入口层完成。
- 复杂业务逻辑从 API 路由中拆分出去。

## 小结 {#summary}

Nuxt Server API 提供了一种在 Nuxt 应用内部编写后端接口的方式。通过 `server/api` 目录，可以快速创建 API 路由，并在页面或组件中通过 `useFetch`、`$fetch` 等方式调用。

在实际项目中，建议遵循以下原则：

- 使用 TypeScript 编写 Server API。
- 使用 `defineEventHandler` 定义 API 处理函数。
- 使用 `getValidatedQuery` 校验 query 参数。
- 使用 `readValidatedBody` 校验请求体。
- 使用 `.get.ts`、`.post.ts` 等文件名约定限定 HTTP 方法。
- 使用 `server/middleware` 处理鉴权、日志等通用逻辑。
- 使用 `createError` 和 `setResponseStatus` 处理错误和状态码。
- 使用 `runtimeConfig` 管理敏感配置。
- 将复杂业务逻辑拆分到 service 层。
- 不要直接信任客户端传入的任何数据。

通过这些实践，可以让 Nuxt Server API 更安全、更清晰，也更适合在生产项目中长期维护。
