# 组件 `Components`

在 Nuxt 中，组件 `components` 是构建页面的基本单元。

将可重用的逻辑和 UI 分离到独立的组件中，以便在多个页面或布局中使用。

以下是如何在 Nuxt 中创建和使用组件的详细步骤：

## 创建组件

### 创建 `components` 目录

在项目的根目录下创建一个 `components` 目录。

 ```
 my-nuxt3-app/
 ├── components/ // [!code ++]
 │   └── MyComponent.vue // [!code ++]
 ├── layouts/
 │   └── default.vue
 ├── pages/
 │   ├── index.vue
 │   └── about.vue
 ├── nuxt.config.js
 └── ...
 ```

### 定义组件

在 `components` 目录中创建一个 Vue 文件，例如 `MyComponent.vue`，并定义组件逻辑：

```vue
<!-- components/MyComponent.vue -->
<template>
 <div class="my-component">
   <h2>{{ title }}</h2>
   <p>{{ content }}</p>
 </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
 title: {
   type: String,
   required: true
 },
 content: {
   type: String,
   required: true
 }
})
</script>
```

## 使用组件

### 在页面中使用组件

::: tip 提示
在页面组件中可以直接使用自定义组件。因为 Nuxt 会自动注册 `components` 目录中的所有组件，因此不需要手动导入它们。
:::

```vue
<!-- pages/index.vue -->
<template>
 <div>
   <h1>Home Page</h1>
   <MyComponent title="Hello, World!" content="This is a custom component." /> // [!code ++]
 </div>
</template>
```

### 在布局中使用组件

可以在布局文件中使用自定义组件：

 ```vue
 <!-- layouts/default.vue -->
 <template>
   <div>
     <header>
       <h1>My Nuxt 3 App</h1>
       <nav>
         <NuxtLink to="/">Home</NuxtLink>
         <NuxtLink to="/about">About</NuxtLink>
       </nav>
     </header>
     <main>
       <MyComponent title="Welcome!" content="This is a layout component." /> // [!code ++]
       <slot />
     </main>
     <footer>
       <p>&copy; 2024 My Nuxt 3 App</p>
     </footer>
   </div>
 </template>
 ```

### 动态组件

可以根据某些条件动态地渲染组件。例如：

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Home Page</h1>
    <component :is="currentComponent" title="Dynamic Component" content="This component is dynamically rendered." /> // [!code ++]
  </div>
</template>

<script setup>
import MyComponent from "~/components/MyComponent.vue";

const currentComponent = ref(MyComponent)
</script>
```

### 异步组件

可以使用动态导入来定义异步组件，这在需要按需加载组件时非常有用：

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>Home Page</h1>
    <Suspense>
      <template #default>
        <MyComponent title="Hello, Async World!" content="This is an async component." /> // [!code ++]
      </template>
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue' // [!code ++]

const MyComponent = defineAsyncComponent(() => import('@/components/MyComponent.vue')) // [!code ++]
</script>
```