# 站点布局 {#layouts}

在 Nuxt 中，布局 `layouts` 是用于定义应用程序的整体结构和外观的模板。布局允许为不同的页面设置不同的结构，比如导航栏、页脚等。

执行操作前需要确保将 `app.vue` 文件中的代码更新为以下内容:

```vue
<template>
   <div>
      <NuxtPage />
   </div>
</template>
```

以下是如何在 Nuxt 中创建和使用布局的详细步骤：

## 创建布局 {#creating-layouts}

### 创建 `layouts` 目录 {#creating-layouts-directory}

在项目的根目录下创建一个 `layouts` 目录，如果还没有的话。

### 创建布局文件 {#creating-layout-files}

在 `layouts` 目录中创建一个布局文件，例如 `default.vue`。

```text {5-6}
my-nuxt4-app/
├── app
│   ├── app.vue
│   └── pages
│       ├── layouts/
│       │   └── default.vue
│       └── index.vue
├── nuxt.config.ts
├── ...
└── tsconfig.json
```

### 定义布局 {#defining-layouts}

在 `default.vue` 中定义你的布局结构：

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
     <slot /> // [!code ++]
   </main>
   <footer>
     <p>&copy; 2024 My Nuxt 3 App</p>
   </footer>
 </div>
</template>
```

在这个例子中，`<slot />` 组件用于渲染当前页面的内容。


## 使用布局 {#using-layouts}

### 默认布局 {#default-layout}

如果站点所有页面都使用同一个布局，可以考虑在 `app.vue` 中进行全局配置。

```vue
<template>
   <div>
      <NuxtLayout>
         <NuxtPage />
      </NuxtLayout>
   </div>
</template>
```

### 使用其他布局 {#using-alternate-layouts}

如果想为某些页面使用不同的布局，可以创建更多布局文件，并在页面组件中指定要使用的布局。

#### 创建布局文件 {#creating-alternate-layout-file}

```vue
<!-- layouts/alternate.vue -->
<template>
  <div>
    <header>
      <h1>Alternate Layout</h1>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/about">About</NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p>&copy; 2024 My Nuxt 3 App - Alternate</p>
    </footer>
  </div>
</template>
```

#### 页面中指定布局 {#specifying-layout-in-page}

在页面组件中，可以通过 `definePageMeta` 方法来指定布局：

```vue
<!-- pages/about.vue -->
<template>
  <div>
    <h2>About Page</h2>
    <p>This is the about page content.</p>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'alternate'
})
</script>
```

在这个例子中，`about.vue` 页面将使用 `layouts/alternate.vue` 布局。

### 动态布局 {#dynamic-layouts}

还可以动态设置布局，例如根据某些条件选择不同的布局。Nuxt 提供了两种方式：

- `definePageMeta()` 适合在页面加载时根据条件选择布局。

- `setPageLayout()` 则适合在运行时（如用户交互后）切换布局。

:::code-group

```vue [definePageMeta()]
<!-- pages/index.vue -->
<script setup>
const isSpecial = true; // 这可以是任何条件

definePageMeta({
  layout: isSpecial ? 'alternate' : 'default'
})
</script>
<template>
  <div>
    <h2>Index Page</h2>
    <p>This is the index page content.</p>
  </div>
</template>
```

```vue [setPageLayout()]
<!-- pages/index.vue -->
<script setup>
const isSpecial = ref(true)

function toggleLayout() {
  isSpecial.value = !isSpecial.value
  // 直接传入布局名称字符串
  setPageLayout(isSpecial.value ? 'alternate' : 'default')
}
</script>
<template>
  <div>
    <h2>Index Page</h2>
    <p>This is the index page content.</p>
    <button @click="toggleLayout">切换布局</button>
  </div>
</template>
```
:::


使用时需要注意以下几点：

1. **直接传入字符串**：与 `definePageMeta` 的 layout 属性不同，`setPageLayout` 的第一个参数就是布局名称本身，不要写成 `setPageLayout({ layout: 'xxx' })`。
2. **依赖 Nuxt 上下文**：它只能在 Nuxt 上下文中调用，因此不能在异步回调（如 `setTimeout`、`await` 之后）的顶层直接使用，需要借助 `nuxtApp.runWithContext` 或在事件处理函数中调用。
3. **避免服务端 hydration 不匹配**：如果在服务端动态设置布局，必须在 Vue 渲染布局之前完成，也就是放在插件（plugin）或路由中间件（route middleware）中调用，否则会出现 `hydration mismatch` 警告。
4. **传递 props**：从 Nuxt 4.4 起，可以通过第二个参数向布局组件传 props，布局内用 defineProps 接收。


| 场景 | 推荐方式 | 说明 |
| --- | --- | --- |
| 页面加载时根据条件选布局 | `definePageMeta` | 在路由元信息层面处理，不会触发 hydration 问题，更稳定 |
| 运行时交互式切换（如点击按钮） | `setPageLayout` | 可在任意时机切换，常配合 `definePageMeta({ layout: false })` 使用 |
| 路由中间件中按权限切换布局 | `setPageLayout` | 在 `defineNuxtRouteMiddleware` 中调用，服务端安全 |
| 需要向布局传 props | 两者皆可 | `definePageMeta` 用对象语法，`setPageLayout` 用第二参数 |

通过使用布局功能，Nuxt 可以轻松地定义和管理应用的整体结构和样式。

在实际开发中可以创建多个布局，并在页面之间自由切换，从而构建出灵活且一致的用户界面。