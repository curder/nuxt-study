# 获取数据

在 Nuxt 中，[`useAsyncData`](https://nuxt.com/docs/api/composables/use-async-data) 和 [`useFetch`](https://nuxt.com/docs/api/composables/use-fetch) 是用于[获取数据](https://nuxt.com/docs/getting-started/data-fetching)的强大工具。

它们简化了数据获取的流程，并且在服务器端渲染（SSR）和客户端渲染（CSR）中都可以使用。

## `useAsyncData`

`useAsyncData` 是 Nuxt 提供的一个钩子，用于在页面加载时进行异步数据获取，借助 [$fetch](https://nuxt.com/docs/api/utils/dollarfetch) 助手以发出 HTTP 请求。

```vue
<!-- pages/todos/index.vue -->
<template>
  <div>
    <h1>Todos</h1>
    <ul>
      <li v-for="todo in todos" :key="todo.id">{{ todo.name }}</li>
    </ul>
    <p v-if="error">{{ error.message }}</p>
  </div>
</template>

<script setup>
const { data: todos, error } = await useAsyncData('todos', () =>
  $fetch('https://jsonplaceholder.typicode.com/todos')
)

if (error.value) {
  console.error('Error fetching users:', error.value)
}
</script>
```

- `useAsyncData` 钩子用于异步获取用户数据。
- 第一个参数 `todos` 是数据的 `key`。
- 第二个参数是一个函数，返回一个 `Promise`（通常是 `$fetch` 调用）。
- `data` 包含获取的数据，`error` 包含可能发生的错误。

> 如果需要发送其他类型的请求，比如 `POST` 可以给 `$fetch` 传递第二个参数，比如：`$fetch(URL, { method: 'POST', body: { hello: 'world '}})`，具体 `$fetch` 的使用[参考官网](https://nuxt.com/docs/api/utils/dollarfetch)。

## `useFetch`

`useFetch` 是 Nuxt 提供的一个钩子，类似于 `useAsyncData`，但更灵活。它可以在客户端和服务端获取数据，并自动处理数据和错误。

```vue
<!-- pages/todos/index.vue -->
<template>
  <div>
    <h1>Todos</h1>
    <ul>
      <li v-for="todo in todos" :key="todo.id">{{ todo.title }}</li>
    </ul>
    <p v-if="error">{{ error.message }}</p>
  </div>
</template>

<script setup>
const { data: todos, error } = useFetch('https://jsonplaceholder.typicode.com/todos')

if (error.value) {
  console.error('Error fetching users:', error.value)
}
</script>
```

- `useFetch` 钩子用于获取用户数据。
- `data` 包含获取的数据，`error` 包含可能发生的错误。

> 如果需要发送其他类型的请求，比如 `POST` 可以给 `useFetch` 传递第二个参数，比如：`useFetch(URL, { method: 'POST', body: { hello: 'world '}})`，具体 `useFetch` 的使用[参考官网](https://nuxt.com/docs/api/composables/use-fetch#params)。


## 参数

### `server`

是否在服务器上获取数据，默认为 `true`。

当设置参数值为 `false` 时，发送 ajax 请求时就不会在服务端渲染，即在调试工具的 Network 处可以看到请求记录，并且在页面源代码中也不会渲染对应数据。