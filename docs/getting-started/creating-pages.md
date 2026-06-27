# 创建页面 {#creating-pages}

在 Nuxt 4 中，页面文件位于 `app/pages` 目录中，每个文件代表一个路由。

> 如果是 Nuxt 3 项目，则页面文件位于 `pages` 目录中。

## 添加页面文件 {#adding-page-files}

例如，要创建一个站点首页和关于的页面，可以在 `app/pages` 目录下创建一个 `index.vue` 和 `about.vue` 文件。

目录结构如下：

```text {5-6}
my-nuxt4-app/
├── app
│   ├── app.vue
│   └── pages
│       ├── about.vue
│       └── index.vue
├── nuxt.config.ts
├── ...
└── tsconfig.json
```

## 编写页面组件 {#writing-page-components}

在对应的文件中，可以编写 Vue 组件。例如：

::: code-group

```vue [app/pages/index.vue]
<script setup>
// 这里可以编写页面逻辑
</script>
<template>
  <div>
    <h1>Index Page</h1>
    <p>Welcome to the index page!</p>
  </div>
</template>
```

```vue [app/pages/about.vue]
<script setup>
// 这里可以编写页面逻辑
</script>
<template>
  <div>
    <h1>About Page</h1>
    <p>Welcome to the about page!</p>
  </div>
</template>
```

:::

## 修改 `app.vue` {#modifying-app-vue}

修改 `app/app.vue` 文件的内容来渲染 `app/pages/index.vue` 和 `app/pages/about.vue` 页面的内容。

```vue {3}
<template>
  <div>
    <NuxtPage />
  </div>
</template>
```

## 启动开发服务器 {#starting-dev-server}

```bash
npm run dev -- -o
```

启动开发服务器后，可以在浏览器中访问 `http://localhost:3000` 和 `http://localhost:3000/about` 来查看创建的页面。

## 其他示例 {#other-examples}

在 Nuxt 4 中，`pages` 目录用于自动生成应用的路由，每个 `.vue` 文件和目录对应一个特定的路由路径。以下是一些关于 `pages` 目录的关键点和使用示例：

### 基础页面 {#basic-pages}

假设项目结构如下：

```text
my-nuxt4-app/
├── app/
│   ├── pages/
│   │   ├── index.vue
│   │   ├── about.vue
│   │   └── contact.vue
├── nuxt.config.ts
└── ...
```

- `index.vue` 页面对应根路径 `/`。
- `about.vue` 页面对应路径 `/about`。
- `contact.vue` 页面对应路径 `/contact`。

### 嵌套路由 {#nested-routes}

可以通过创建子目录来生成嵌套路由。例如：

```
my-nuxt4-app/
├── app/
│   ├── pages/
│   │   ├── index.vue
│   │   ├── todos/
│   │   │   ├── index.vue // [!code ++]
│   │   │   └── [slug].vue // [!code ++]
├── nuxt.config.ts
└── ...
```

- `app/pages/todos/index.vue` 页面对应路径 `/todos`。
- `app/pages/todos/[slug].vue` 页面对应动态路由 `/todos/:slug`。

### 动态路由 {#dynamic-routes}

在 Nuxt 中，可以使用方括号 `[]` 定义动态路由。例如：

```vue
<!-- app/pages/blog/[slug].vue -->
<template>
  <div>
    <h1>Blog Post: {{ slug }}</h1>
  </div>
</template>

<script setup>
const route = useRoute();
const slug = route.params.slug;
</script>
```

::: tip 提示
使用 `useRoute()` 返回当前路由信息，比如请求的参数。
:::

### 路由命名 {#route-naming}

可以通过在 `pages` 目录中使用特定的命名约定来自定义路由。例如：

```vue
<!-- app/pages/user/[id]/profile.vue -->
<template>
  <div>
    <h1>User Profile: {{ id }}</h1>
  </div>
</template>

<script setup>
const route = useRoute();
const id = route.params.id;
</script>
```

### 示例代码 {#example-code}

以下是一个示例，展示了如何使用这些概念，项目结构如下：

```
my-nuxt4-app/
├── app/
│   ├── pages/
│   │   ├── index.vue
│   │   ├── about.vue
│   │   ├── todos/
│   │   │   ├── index.vue
│   │   │   └── [slug].vue
│   │   └── user/
│   │       └── [id]/
│   │           └── profile.vue
├── nuxt.config.ts
└── ...
```

- `app/pages/index.vue`

```vue
<template>
  <div>
    <h1>Home Page</h1>
    <nuxt-link to="/about">About</nuxt-link>
    <nuxt-link to="/todos">todos</nuxt-link>
  </div>
</template>
```

- `app/pages/about.vue`

```vue
<template>
  <div>
    <h1>About Page</h1>
  </div>
</template>
```

- `app/pages/todos/index.vue`

```vue
<template>
  <div>
    <h1>Todos</h1>
    <nuxt-link to="/todos/my-first-todo">My First Todo</nuxt-link>
  </div>
</template>
```

- `app/pages/todos/[slug].vue`

```vue
<template>
  <div>
    <h1>Todo: {{ slug }}</h1>
  </div>
</template>

<script setup>
const route = useRoute();
const slug = route.params.slug;
</script>
```

- `app/pages/user/[id]/profile.vue`

```vue
<template>
  <div>
    <h1>User Profile: {{ id }}</h1>
  </div>
</template>

<script setup>
const id = useRoute().params.id;
</script>
```

通过以上示例，可以看到如何在 Nuxt 4 中创建和组织页面，以及如何使用动态路由和嵌套路由来构建复杂的导航结构。
