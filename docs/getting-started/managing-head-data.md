# 管理头部数据

在 Nuxt 中，使用 [`useHead`](https://nuxt.com/docs/api/composables/use-head) 来管理头部数据非常方便。它可以在组合式 API 中设置页面的 `<head>` 内容，包括标题、meta 标签、link 标签等。

## 设置页面标题和描述

在页面中使用 `useHead` 来设置和管理头部数据，或者也可以使用 `Head` 和 `Meta` 标签来管理它们。

::: code-group
```vue [使用 useHead]
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt 3 App</h1>
  </div>
</template>

<script setup>
useHead({ // [!code ++]
  title: 'Home - My Nuxt 3 App', // [!code ++]
  meta: [ // [!code ++]
    { // [!code ++]
      name: 'description', // [!code ++]
      content: 'Welcome to my Nuxt 3 application!' // [!code ++]
    } // [!code ++]
  ] // [!code ++]
}) // [!code ++]
</script>
```

```vue [使用 Head 和 Meta 标签]
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt 3 App</h1>
  </div>
  <Head> // [!code ++]
    <Title>Home - My Nuxt 3 App</Title> // [!code ++]
    <Meta name="description" content="Welcome to my Nuxt 3 application!"></Meta> // [!code ++]
  </Head> // [!code ++]
</template>
```
:::


## 设置 `link` 和 `script` 标签

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Welcome to My Nuxt 3 App</h1>
  </div>
</template>

<script setup>
useHead({
  title: 'Home - My Nuxt 3 App',
  link: [
    {
      rel: 'stylesheet',
      href: 'https://example.com/styles.css'
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

## 动态设置头部数据

根据组件的状态动态设置头部数据。


```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>{{ title }}</h1>
  </div>
</template>
<script setup>
let title = ref('Home - My Nuxt 3 App');

setTimeout(() => title.value = 'New home - My Nuxt 3 App', 2000)

useHead({
  title,
})
</script>
```