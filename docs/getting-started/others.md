# 其他 Others {#others}

本页整理一些 Nuxt 项目中常见但不一定适合单独成章的高频实践，包括路由配置、构建配置、SSR 安全、错误处理、运行时配置和 Nuxt 4 目录结构等内容。

所有示例默认使用 TypeScript，并统一使用 `<script setup lang="ts">`。在 Nuxt 4 项目中，应用相关代码推荐放在 `app/` 目录下，例如 `app/pages/`、`app/components/`、`app/composables/`、`app/layouts/`。

## Nuxt 4 目录结构说明 {#nuxt-4-directory-structure}

Nuxt 4 推荐将应用层代码放入 `app/` 目录。这样可以更清晰地区分前端应用代码、服务端代码、公共静态资源和共享代码。

常见目录结构如下：

```text
app/
  app.vue
  error.vue
  assets/
  components/
  composables/
  layouts/
  middleware/
  pages/
  plugins/
  utils/
server/
  api/
  routes/
  middleware/
public/
nuxt.config.ts
```

其中：

- `app/pages/` 用于页面路由；
- `app/components/` 用于 Vue 组件；
- `app/composables/` 用于组合式函数；
- `app/layouts/` 用于布局；
- `app/middleware/` 用于路由中间件；
- `app/error.vue` 用于全局错误页面；
- `server/api/` 用于 API 接口；
- `public/` 用于无需构建处理、需要固定 URL 访问的静态文件。

::: tip 最佳实践
Nuxt 4 项目中建议使用 `app/` 目录组织应用代码。示例代码中的页面路径也建议写成 `app/pages/example.vue`，避免继续沿用旧项目中根目录 `pages/` 的写法。
:::

## 路径添加 `.html` 后缀 {#add-html-suffix}

可以通过 `definePageMeta()` 的 `path` 配置为页面路由添加 `.html` 后缀。

::: code-group

```vue [静态路由]
<!-- app/pages/todos.vue -->
<template>
  <div>
    <h1>Todos Page</h1>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  path: '/todos.html'
})
</script>
```

```vue [动态路由]
<!-- app/pages/todos/[slug].vue -->
<template>
  <div>
    <h1>Todo: {{ slug }}</h1>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const slug = computed(() => route.params.slug as string)

definePageMeta({
  path: '/todos/:slug.html'
})
</script>
```

:::

::: warning 注意
如果项目中同时存在默认路径和自定义 `.html` 路径，需要注意避免重复路由、SEO 重复收录和站点地图生成冲突。
:::

## 打包时图片禁止转换为 base64 {#disable-base64}

使用 Vite 的 `assetsInlineLimit` 配置项可以控制图片资源是否被转换为 base64。将其设置为 `0` 可以禁止资源内联，确保图片以文件形式被打包和加载。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    build: {
      assetsInlineLimit: 0
    }
  }
})
```

::: tip 使用场景
如果希望所有图片资源都以独立文件形式输出，例如方便 CDN 缓存、调试资源路径或避免 HTML/CSS 体积膨胀，可以将 `assetsInlineLimit` 设置为 `0`。
:::

## 统一使用 TypeScript 示例 {#use-typescript-examples}

Nuxt 默认对 TypeScript 有良好支持。项目中的配置文件、插件、服务端接口和组件脚本建议优先使用 `.ts` 或 `lang="ts"`。

推荐写法：

```vue
<script setup lang="ts">
interface User {
  id: number
  name: string
}

const user = ref<User>({
  id: 1,
  name: 'Nuxt'
})
</script>
```

不推荐在文档示例中继续使用无类型版本：

```vue
<script setup>
const user = ref({
  id: 1,
  name: 'Nuxt'
})
</script>
```

配置文件也建议使用 `.ts`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  devtools: {
    enabled: true
  }
})
```

::: tip 最佳实践
文档示例统一使用 TypeScript，可以让读者更自然地使用 Nuxt 内置类型推导，也能减少后续项目迁移成本。
:::

## composable 中的 SSR 安全状态 {#ssr-safe-state-in-composables}

在 Nuxt SSR 场景中，不建议在模块顶层定义可变状态，否则可能出现跨请求共享状态的问题。

不推荐：

```ts
// app/composables/useCounter.ts
const count = ref(0)

export function useCounter() {
  function increment() {
    count.value++
  }

  return {
    count,
    increment
  }
}
```

上面的 `count` 定义在模块顶层，服务端运行时可能被多个请求共享。

推荐使用 `useState()`：

```ts
// app/composables/useCounter.ts
export function useCounter() {
  const count = useState<number>('counter', () => 0)

  function increment() {
    count.value++
  }

  return {
    count,
    increment
  }
}
```

在组件中使用：

```vue
<!-- app/components/CounterButton.vue -->
<template>
  <button type="button" @click="increment">
    Count: {{ count }}
  </button>
</template>

<script setup lang="ts">
const { count, increment } = useCounter()
</script>
```

::: tip 最佳实践
局部组件状态可以继续使用 `ref()`；需要在 SSR 中安全初始化、跨组件共享、参与服务端到客户端水合的状态，优先使用 `useState()`。
:::

## 客户端限定代码 {#client-only-code}

浏览器 API 例如 `window`、`document`、`localStorage` 只存在于客户端。Nuxt SSR 阶段无法直接访问这些对象。

不推荐：

```vue
<script setup lang="ts">
const width = ref(window.innerWidth)
</script>
```

推荐使用 `import.meta.client` 判断：

```vue
<script setup lang="ts">
const width = ref(0)

if (import.meta.client) {
  width.value = window.innerWidth
}
</script>
```

如果需要在组件挂载后访问浏览器 API，可以使用 `onMounted()`：

```vue
<script setup lang="ts">
const width = ref(0)

onMounted(() => {
  width.value = window.innerWidth
})
</script>
```

如果某个组件只能在客户端渲染，可以使用 `<ClientOnly>`：

```vue
<template>
  <ClientOnly>
    <ClientOnlyChart />
  </ClientOnly>
</template>
```

::: warning 注意
不要在组件初始化阶段直接访问 `window`、`document` 或 `localStorage`。在 SSR 项目中，这类代码应放在客户端判断或生命周期中。
:::

## 运行时配置 runtimeConfig {#runtime-config}

Nuxt 中可以通过 `runtimeConfig` 管理运行时配置。服务端私有配置不要暴露到 `public` 中，只有 `public` 下的配置才会暴露给客户端。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',

    public: {
      apiBase: '/api'
    }
  }
})
```

在服务端 API 中使用：

```ts
// server/api/config-example.get.ts
export default defineEventHandler(() => {
  const config = useRuntimeConfig()

  return {
    apiBase: config.public.apiBase
  }
})
```

在组件中使用公开配置：

```vue
<script setup lang="ts">
const config = useRuntimeConfig()

const apiBase = computed(() => config.public.apiBase)
</script>
```

::: tip 最佳实践
密钥、Token、数据库连接等敏感信息只能放在 `runtimeConfig` 顶层，不要放入 `runtimeConfig.public`。
:::

## 页面 SEO 配置 {#page-seo}

页面 SEO 信息可以使用 `useSeoMeta()` 配置，适合设置标题、描述、OG 信息等。

```vue
<!-- app/pages/about.vue -->
<template>
  <main>
    <h1>About</h1>
  </main>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'About',
  description: 'About page description',
  ogTitle: 'About',
  ogDescription: 'About page description',
  ogImage: '/og-image.png'
})
</script>
```

如果需要更灵活地控制 `htmlAttrs`、`bodyAttrs`、`link`、`script` 等，可以使用 `useHead()`：

```vue
<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'zh-CN'
  },
  link: [
    {
      rel: 'canonical',
      href: 'https://example.com/about'
    }
  ]
})
</script>
```

::: tip 最佳实践
页面标题、描述、OG 信息优先使用 `useSeoMeta()`；更底层的 HTML 属性、外链资源和脚本配置再使用 `useHead()`。
:::

## 页面布局配置 {#page-layout}

可以通过 `definePageMeta()` 为页面指定布局。

```vue
<!-- app/pages/dashboard.vue -->
<template>
  <section>
    <h1>Dashboard</h1>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>
```

对应布局文件：

```vue
<!-- app/layouts/dashboard.vue -->
<template>
  <div class="dashboard-layout">
    <aside>Sidebar</aside>

    <main>
      <slot />
    </main>
  </div>
</template>
```

如果页面不需要布局，可以设置为 `false`：

```vue
<script setup lang="ts">
definePageMeta({
  layout: false
})
</script>
```

## 路由中间件 {#route-middleware}

Nuxt 支持在 `app/middleware/` 中定义路由中间件。

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(() => {
  const user = useState<{ id: number; name: string } | null>('user', () => null)

  if (!user.value) {
    return navigateTo('/login')
  }
})
```

页面中使用中间件：

```vue
<!-- app/pages/profile.vue -->
<template>
  <main>
    <h1>Profile</h1>
  </main>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
</script>
```

也可以定义全局中间件，文件名使用 `.global.ts`：

```ts
// app/middleware/track.global.ts
export default defineNuxtRouteMiddleware((to) => {
  console.log('Navigate to:', to.path)
})
```

::: warning 注意
全局中间件会在每次路由切换时执行，应避免放入过重逻辑。
:::

## 服务端 API 路由 {#server-api-routes}

Nuxt 可以在 `server/api/` 中创建 API 路由。文件名会自动映射为接口路径。

```ts
// server/api/hello.get.ts
export default defineEventHandler(() => {
  return {
    message: 'Hello Nuxt'
  }
})
```

客户端调用：

```vue
<script setup lang="ts">
const { data } = await useFetch('/api/hello')
</script>

<template>
  <pre>{{ data }}</pre>
</template>
```

动态 API 路由：

```ts
// server/api/users/[id].get.ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')

  return {
    id,
    name: `User ${id}`
  }
})
```

::: tip 最佳实践
服务端 API 文件建议使用 HTTP 方法后缀，例如 `.get.ts`、`.post.ts`、`.put.ts`、`.delete.ts`，这样接口职责更清晰。
:::

## 组件局部错误捕获 {#nuxt-error-boundary}

可以使用 `<NuxtErrorBoundary>` 捕获组件树中的客户端渲染错误，避免局部组件错误影响整个页面。

```vue
<!-- app/pages/report.vue -->
<template>
  <NuxtErrorBoundary>
    <ReportChart />

    <template #error="{ error, clearError }">
      <div class="error-box">
        <p>图表加载失败：{{ error.message }}</p>

        <button type="button" @click="clearError">
          重试
        </button>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>
```

::: tip 使用场景
`<NuxtErrorBoundary>` 适合包裹图表、富文本、第三方组件、复杂异步组件等容易出现局部渲染错误的区域。
:::

## 抛出错误 createError {#create-error}

在页面、服务端接口或组合式函数中，可以使用 `createError()` 抛出 Nuxt 错误。

页面中抛出 404：

```vue
<!-- app/pages/posts/[slug].vue -->
<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { data: post } = await useFetch(`/api/posts/${slug}`)

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Post Not Found',
    fatal: true
  })
}
</script>

<template>
  <article>
    <h1>{{ post?.title }}</h1>
  </article>
</template>
```

API 中抛出错误：

```ts
// server/api/posts/[slug].get.ts
export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing slug'
    })
  }

  return {
    slug,
    title: `Post ${slug}`
  }
})
```

::: warning 注意
在页面中使用 `createError()` 时，如果希望进入全局错误页，可以设置 `fatal: true`。局部业务错误也可以在组件内自行处理，不一定都需要抛到全局错误页。
:::

## 全局错误页面 error.vue {#error-vue}

Nuxt 4 中可以在 `app/error.vue` 中定义全局错误页面。

```vue
<!-- app/error.vue -->
<template>
  <main class="error-page">
    <h1>{{ error.statusCode }}</h1>
    <p>{{ error.statusMessage || '页面发生错误' }}</p>

    <button type="button" @click="handleError">
      返回首页
    </button>
  </main>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{
  error: NuxtError
}>()

function handleError() {
  clearError({
    redirect: '/'
  })
}
</script>
```

::: tip 最佳实践
`app/error.vue` 适合处理全局错误页面，例如 404、500 等。局部组件错误优先使用 `<NuxtErrorBoundary>`，业务接口错误可以在页面中根据状态自行展示。
:::

## 插件只在客户端运行 {#client-only-plugin}

如果插件依赖浏览器 API，可以使用 `.client.ts` 后缀让它只在客户端运行。

```ts
// app/plugins/analytics.client.ts
export default defineNuxtPlugin(() => {
  window.addEventListener('load', () => {
    console.log('analytics loaded')
  })
})
```

如果插件只应在服务端运行，可以使用 `.server.ts`：

```ts
// app/plugins/server-log.server.ts
export default defineNuxtPlugin(() => {
  console.log('server only plugin')
})
```

::: tip 最佳实践
依赖 `window`、`document`、浏览器 SDK 的插件使用 `.client.ts`；依赖服务端环境、密钥或 Node 能力的插件使用 `.server.ts`。
:::

## 公共静态资源 public {#public-assets}

`public/` 目录中的文件不会经过构建处理，会以根路径直接暴露。

```text
public/
  favicon.ico
  robots.txt
  og-image.png
```

访问路径：

```text
/favicon.ico
/robots.txt
/og-image.png
```

在 SEO 中引用：

```vue
<script setup lang="ts">
useSeoMeta({
  ogImage: '/og-image.png'
})
</script>
```

::: warning 注意
`public/` 适合放置需要固定 URL 的静态文件。需要被构建工具处理、压缩、哈希化的图片、字体和样式文件应放在 `app/assets/`。
:::
