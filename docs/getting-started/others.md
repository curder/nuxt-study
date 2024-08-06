# 其他 Others

## 路径添加 `.html` 后缀

::: code-group
```vue [静态路由]
<!--pages/tods.vue-->
<template>
  <div>
    <h1>Todos Page</h1>
  </div>
</template>

<script setup>
definePageMeta({ // [!code ++]
  path: `/todos.html`, // [!code ++]
}) // [!code ++]
</script>
```

```vue [动态路由]
<!--pages/todos/[slug].vue-->
<template>
  <div>
    <h1>Todo: {{ slug }}</h1>
  </div>
</template>

<script setup>
const slug = useRoute().params.slug

definePageMeta({ // [!code ++]
  path: `/todos/:slug.html` // [!code ++]
}) // [!code ++]
</script>
```
:::
