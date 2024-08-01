# 站点布局

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

## 创建布局

### 创建 `layouts` 目录

在项目的根目录下创建一个 `layouts` 目录，如果还没有的话。

### 创建布局文件

在 `layouts` 目录中创建一个布局文件，例如 `default.vue`。

```text
my-nuxt3-app/
├── layouts/ // [!code ++]
│   └── default.vue // [!code ++]
├── pages/
│   ├── index.vue
│   └── about.vue
├── nuxt.config.js
└── ...
```

### 定义布局

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


## 使用布局

### 默认布局

如果站点所有页面都使用同一个布局，可以考虑在 `app.vue` 中进行全局配置。

```vue
<template>
   <div>
      <NuxtLayout> // [!code ++]
         <NuxtPage />
      </NuxtLayout> // [!code ++]
   </div>
</template>
```

### 使用其他布局

如果想为某些页面使用不同的布局，可以创建更多布局文件，并在页面组件中指定要使用的布局。

#### 创建布局文件

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
      <layout /> // [!code ++]
    </main>
    <footer>
      <p>&copy; 2024 My Nuxt 3 App - Alternate</p>
    </footer>
  </div>
</template>
```

#### 页面中指定布局

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

### 动态布局

还可以动态设置布局，例如根据某些条件选择不同的布局：

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h2>Index Page</h2>
    <p>This is the index page content.</p>
  </div>
</template>

<script setup>
const isSpecial = true; // 这可以是任何条件

definePageMeta({
  layout: isSpecial ? 'alternate' : 'default'
})
</script>
```

通过使用布局功能，Nuxt 可以轻松地定义和管理应用的整体结构和样式。

在实际开发中可以创建多个布局，并在页面之间自由切换，从而构建出灵活且一致的用户界面。