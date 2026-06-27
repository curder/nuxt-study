# 管理头部数据 {#managing-head-data}

在 Nuxt 中，页面的 `<head>` 数据包括页面标题、SEO meta、Open Graph 信息、Twitter Card、`link`、`script` 等内容。合理管理这些信息可以提升搜索引擎收录效果、社交分享展示效果，以及页面的可维护性。

在 Nuxt 4.x+ 中，推荐优先使用 [`useSeoMeta`](https://nuxt.com/docs/api/composables/use-seo-meta) 管理常见 SEO meta 信息。它具备更好的类型安全能力，可以减少常见的 meta 字段拼写错误，例如把 `description`、`ogTitle`、`ogDescription` 等字段写错。

对于更通用的 head 控制，例如添加外部样式、脚本、结构化数据，仍然可以使用 [`useHead`](https://nuxt.com/docs/api/composables/use-head)。

## 设置页面标题和描述 {#setting-title-and-description}

推荐使用 `useSeoMeta()` 设置页面标题、描述和常见 SEO 信息。

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt App</h1>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Home - My Nuxt App',
  description: 'Welcome to my Nuxt application!',
  ogTitle: 'Home - My Nuxt App',
  ogDescription: 'Welcome to my Nuxt application!',
  ogType: 'website'
})
</script>
```

相比手动书写 `meta` 数组，`useSeoMeta()` 的优势是字段更加直观，并且具备类型提示。这样可以避免常见的拼写错误，也能让 SEO 配置更容易维护。

如果需要直接控制完整的 `<head>` 结构，也可以使用 `useHead()`。

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt App</h1>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Home - My Nuxt App',
  meta: [
    {
      name: 'description',
      content: 'Welcome to my Nuxt application!'
    }
  ]
})
</script>
```

也可以在模板中使用 `Head`、`Title` 和 `Meta` 组件来声明页面头部内容。

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt App</h1>
  </div>

  <Head>
    <Title>Home - My Nuxt App</Title>
    <Meta name="description" content="Welcome to my Nuxt application!" />
  </Head>
</template>
```

不过在大多数 SEO 场景中，更推荐优先使用 `useSeoMeta()`，因为它更符合 Nuxt 4.x+ 中管理 SEO 信息的推荐方式。

## 设置 `link` 和 `script` 标签 {#setting-link-and-script-tags}

`useSeoMeta()` 主要用于 SEO 相关的 meta 信息。如果需要添加外部样式、脚本、预加载资源、canonical 链接等内容，可以使用 `useHead()`。

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt App</h1>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Home - My Nuxt App',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://example.com/styles.css'
    },
    {
      rel: 'canonical',
      href: 'https://example.com/'
    }
  ],
  script: [
    {
      src: 'https://example.com/script.js',
      async: true
    }
  ]
})
</script>
```

如果只是设置页面标题、描述、Open Graph 等 SEO 信息，优先使用 `useSeoMeta()`；如果需要控制更底层的 `head` 标签结构，则使用 `useHead()`。

## 动态设置头部数据 {#dynamically-setting-head-data}

在实际项目中，很多页面的 SEO 信息都来自接口数据，例如博客详情页、商品详情页、文档详情页等。此时可以结合 `useAsyncData()` 获取页面数据，并使用 `useSeoMeta()` 动态设置 SEO 信息。

```vue
<!-- pages/blog/[slug].vue -->
<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <p>{{ post.description }}</p>
    <div v-html="post.content"></div>
  </article>
</template>

<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(`post-${route.params.slug}`, () => {
  return $fetch(`/api/posts/${route.params.slug}`)
})

useSeoMeta({
  title: () => post.value?.title || 'Blog',
  description: () => post.value?.description || 'Read the latest blog posts.',
  ogTitle: () => post.value?.title || 'Blog',
  ogDescription: () => post.value?.description || 'Read the latest blog posts.',
  ogImage: () => post.value?.cover || '/default-og-image.png',
  ogType: 'article'
})
</script>
```

这里使用函数形式返回动态值，可以确保当 `post` 数据更新时，SEO 信息也能根据页面数据同步更新。

## 结合 `definePageMeta` 管理页面级信息 {#using-define-page-meta}

`definePageMeta()` 适合定义页面级元信息，例如布局、权限、中间件、页面 key 等。它不直接替代 `useSeoMeta()` 或 `useHead()`，而是与它们配合使用。

例如在博客详情页中，可以使用 `definePageMeta()` 声明页面布局和中间件，再使用 `useSeoMeta()` 设置 SEO 信息。

```vue
<!-- pages/blog/[slug].vue -->
<template>
  <article v-if="post">
    <h1>{{ post.title }}</h1>
    <p>{{ post.description }}</p>
  </article>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'blog',
  middleware: ['track-page-view']
})

const route = useRoute()

const { data: post } = await useAsyncData(`post-${route.params.slug}`, () => {
  return $fetch(`/api/posts/${route.params.slug}`)
})

useSeoMeta({
  title: () => post.value?.title || 'Blog',
  description: () => post.value?.description || 'Read more articles on our blog.',
  ogTitle: () => post.value?.title || 'Blog',
  ogDescription: () => post.value?.description || 'Read more articles on our blog.',
  ogImage: () => post.value?.cover || '/default-og-image.png',
  ogType: 'article'
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: () => `https://example.com/blog/${route.params.slug}`
    }
  ]
})
</script>
```

这个示例体现了一个更完整的页面级最佳实践：

1. 使用 `definePageMeta()` 管理页面配置，例如布局和中间件。
2. 使用 `useAsyncData()` 获取动态页面内容。
3. 使用 `useSeoMeta()` 设置类型安全的 SEO 信息。
4. 使用 `useHead()` 补充 canonical、script、link 等更通用的 head 标签。

## 使用建议 {#recommendations}

在 Nuxt 4.x+ 项目中，可以按照以下优先级选择合适的 API：

| 场景 | 推荐 API | 说明 |
|---|---|---|
| 设置标题、描述、Open Graph、Twitter Card | `useSeoMeta()` | 推荐优先使用，类型安全，减少拼写错误 |
| 添加 `link`、`script`、结构化数据 | `useHead()` | 适合更通用、更底层的 head 控制 |
| 在模板中声明简单 head 内容 | `<Head>`、`<Title>`、`<Meta>` | 适合少量静态内容 |
| 定义页面布局、中间件、权限等页面配置 | `definePageMeta()` | 与 SEO API 配合使用，不直接替代 SEO 设置 |

一般来说，SEO 相关内容优先使用 `useSeoMeta()`；非 SEO 的 head 标签使用 `useHead()`；页面级行为和配置使用 `definePageMeta()`。
