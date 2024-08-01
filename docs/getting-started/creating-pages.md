# 创建页面

在 Nuxt 3 中，页面文件位于 `pages` 目录中，每个文件代表一个路由。

## 添加页面文件

例如，要创建一个站点首页和关于的页面，可以在 `pages` 目录下创建一个 `index.vue` 和 `about.vue` 文件。

目录结构如下：

```text
my-nuxt3-app/
├── pages/
│   ├── index.vue // [!code ++]
│   └── about.vue // [!code ++]
├── nuxt.config.js
└── ...
```

## 编写页面组件

在对应的文件中，可以编写 Vue 组件。例如：

::: code-group
```vue [pages/index.vue]
<template>
  <div>
    <h1>Index Page</h1>
    <p>Welcome to the index page!</p>
  </div>
</template>
```

```vue [pages/about.vue]
<template>
  <div>
    <h1>About Page</h1>
    <p>Welcome to the about page!</p>
  </div>
</template>
```
:::

## 修改 `app.vue`

修改 `app.vue` 文件的内容来渲染 `pages/index.vue` 和 `pages/about.vue` 页面的内容。

```vue
<template>
  <div>
    <NuxtRouteAnnouncer /> // [!code --]
    <NuxtWelcome /> // [!code --]
    <NuxtPage /> // [!code ++]
  </div>
</template>
```

## 启动开发服务器

```bash
npm run dev -- -o
```

启动开发服务器后，可以在浏览器中访问 http://localhost:3000 和 http://localhost:3000/about 来查看创建的页面。

## 其他示例

在 Nuxt 3 中，`pages` 目录用于自动生成应用的路由，每个 `.vue` 文件和目录对应一个特定的路由路径。以下是一些关于 `pages` 目录的关键点和使用示例：

### 基础页面

假设项目结构如下：

```text
my-nuxt3-app/
├── pages/
│   ├── index.vue // [!code ++]
│   ├── about.vue // [!code ++]
│   └── contact.vue // [!code ++]
├── nuxt.config.js
└── ...
```

- `index.vue` 对应根路径 `/`。
- `about.vue` 对应路径 `/about`。
- `contact.vue` 对应路径 `/contact`。

### 嵌套路由

可以通过创建子目录来生成嵌套路由。例如：

```
my-nuxt3-app/
├── pages/
│   ├── index.vue
│   ├── todos/
│   │   ├── index.vue // [!code ++]
│   │   └── [slug].vue // [!code ++]
├── nuxt.config.js
└── ...
```

- `pages/todos/index.vue` 对应路径 `/todos`。
- `pages/todos/[slug].vue` 对应动态路由 `/todos/:slug`。

### 动态路由

在 Nuxt 3 中，可以使用方括号 `[]` 定义动态路由。例如：

```vue
<!-- pages/blog/[slug].vue -->
<template>
  <div>
    <h1>Blog Post: {{ slug }}</h1>
  </div>
</template>

<script setup>
const route = useRoute()
const slug = route.params.slug
</script>
```

::: tip 提示
使用 `useRoute()` 返回当前路由信息，比如请求的参数。
:::

### 路由命名

可以通过在 `pages` 目录中使用特定的命名约定来自定义路由。例如：

```vue
<!-- pages/user/[id]/profile.vue -->
<template>
  <div>
    <h1>User Profile: {{ id }}</h1>
  </div>
</template>

<script setup>
const route = useRoute()
const id = route.params.id
</script>
```

### 示例代码

以下是一个示例，展示了如何使用这些概念，项目结构如下：

```
my-nuxt3-app/
├── pages/
│   ├── index.vue
│   ├── about.vue
│   ├── todos/
│   │   ├── index.vue
│   │   └── [slug].vue
│   └── user/
│       └── [id]/
│           └── profile.vue
├── nuxt.config.js
└── ...
```

- `pages/index.vue`

```vue
<template>
  <div>
    <h1>Home Page</h1>
    <nuxt-link to="/about">About</nuxt-link>
    <nuxt-link to="/todos">todos</nuxt-link>
  </div>
</template>
```

- `pages/about.vue`

```vue
<template>
  <div>
    <h1>About Page</h1>
  </div>
</template>
```

- `pages/todos/index.vue`

```vue
<template>
  <div>
    <h1>Todos</h1>
    <nuxt-link to="/todos/my-first-todo">My First Todo</nuxt-link>
  </div>
</template>
```

- `pages/todos/[slug].vue`

```vue
<template>
  <div>
    <h1>Todo: {{ slug }}</h1>
  </div>
</template>

<script setup>
const route = useRoute()
const slug = route.params.slug
</script>
```

- `pages/user/[id]/profile.vue`

```vue
<template>
  <div>
    <h1>User Profile: {{ id }}</h1>
  </div>
</template>

<script setup>
const id = useRoute().params.id
</script>
```

通过以上示例，可以看到如何在 Nuxt 3 中创建和组织页面，以及如何使用动态路由和嵌套路由来构建复杂的导航结构。