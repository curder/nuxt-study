# 服务器 api {#server-api}

在 Nuxt 中，构建一个 [Server API](https://nuxt.com/docs/guide/directory-structure/server) 可以通过 `server/api` 目录来实现。

允许创建服务器端的 API 路由，直接在 Nuxt 应用中处理后端逻辑。

## 创建 Server API 路由 {#creating-server-api-routes}

### 创建 `server/api` 目录 {#creating-server-api-directory}

在 Nuxt 项目的根目录下创建 `server/api` 目录：

```text
my-nuxt3-app/
├── server/
│   ├── api/ //![code ++]
│   │   ├── hello.js
├── pages/
│   └── index.vue
├── nuxt.config.ts
└── package.json
```

### 创建一个 API 路由文件 {#creating-api-route-file}

在 `server/api` 目录下创建一个 API 路由文件，例如 `hello.js`：

```js
// server/api/hello.js
export default defineEventHandler((event) => {
  return {
    message: 'Hello, world!'
  }
})
```

在这个示例中：
- `defineEventHandler` 用于定义一个事件处理器，处理传入的请求并返回一个响应。

### 访问 API 路由 {#accessing-api-route}

通过 `http://localhost:3000/api/hello` 访问这个 API 路由，得到的响应将是：

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
  </div>
</template>

<script setup>
import { useFetch } from '#app'

const { data, pending, error } = useFetch('/api/hello')

const message = data?.value?.message
</script>
```

在这个示例中：
- `useFetch` 钩子用于从 `/api/hello` 获取数据，并在模板中显示返回的 `message`。

## 创建更复杂的 API 路由 {#creating-more-complex-api-routes}

可以创建更复杂的 API 路由，包括处理请求参数、请求体和响应状态码。

### 处理请求参数 {#handling-query-parameters}

```js
// server/api/greet.js
export default defineEventHandler((event) => {
  const { name } = getQuery(event)
  return {
    message: `Hello, ${name || 'world'}!`
  }
})
```

通过 `http://localhost:3000/api/greet?name=Nuxt` 访问这个 API 路由，得到的响应将是：

```json
{
  "message": "Hello, Nuxt!"
}
```

### 2. 处理请求体 {#handling-request-body}

```js
// server/api/echo.js
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return {
    message: `You said: ${body.message}`
  }
})
```

可以向 `http://localhost:3000/api/echo` 发送一个 POST 请求，并在请求体中包含 JSON 数据：

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