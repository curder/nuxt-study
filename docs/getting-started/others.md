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


## 打包时图片禁止转换base64

使用 [`assetsInlineLimit`](https://vite.dev/config/build-options#build-assetsinlinelimit) 配置项可以控制图片资源是否被转换为 base64 格式。将其设置为 `0` 可以禁止图片被转换为 base64，从而确保图片以文件形式被打包和加载。

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    build: { 
      assetsInlineLimit: 0, // 禁止将图片转换为base64
    }
  }
})
```