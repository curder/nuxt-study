# 链接 NuxtLink

在 Nuxt 中，可以使用 [`<NuxtLink>`](https://nuxt.com/docs/api/components/nuxt-link) 组件创建链接以在页面之间导航。

假设项目结构如下：

```
my-nuxt3-app/
├── pages/
│   ├── index.vue
│   ├── about.vue
│   ├── todos/
│   │   ├── index.vue
│   │   └── [slug].vue
├── nuxt.config.js
└── ...
```

## 类型

### 内部路由

- 静态路由
  ```vue
  <NuxtLink to="/"></NuxtLink>
  ```

- 动态路由
  ```vue
  <NuxtLink :to="{ name: 'todos-slug', params: { slug: 'my-first-todo' } }">Todo Detail</NuxtLink>
  ```

### 外部路由
```vue
<NuxtLink to="https://nuxtjs.org">Nuxt website</NuxtLink>
```

## 示例

### 首页 `/`

在首页上，可以创建链接到 `about` 和 `todos` 页面：

```vue
<!--pages/index.vue-->
<template>
  <div>
    <h1>Home Page</h1>
    <NuxtLink :to="{name: 'about'}">Go to About Page</NuxtLink>
    <NuxtLink to="/todos">Go to Blog Page</NuxtLink>
  </div>
</template>
```

### 关于页面 `/about`

在关于页面上，可以创建一个返回主页的链接：

```vue
<!--pages/about.vue-->
<template>
  <div>
    <h1>About Page</h1>
    <nuxt-link to="/">Back to Home Page</nuxt-link>
  </div>
</template>
```

### 待办事项列表 `/todos`

在待办事项列表上，可以创建一个链接到特定的详情页面：

```vue
<!--pages/todos/index.vue-->
<template>
  <div>
    <h1>Home</h1>
    <nuxt-link :to="{name: 'todos', params: {slug: 'my-first-todo'}}">Read My First Todo</nuxt-link>
  </div>
</template>
```

### 动态待办事项详情 `todos/:slug`

在动态待办事项的详情页面上，可以显示待办事项的 `slug` 并添加一个返回首页的链接：

```vue
<!--pages/todos/[slug].vue-->
<template>
  <div>
    <h1>Todo: {{ slug }}</h1>
    <nuxt-link to="/todos">Back to Todos</nuxt-link>
  </div>
</template>

<script setup>
const route = useRoute()
const slug = route.params.slug
</script>
```
