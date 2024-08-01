# 样式 Styles

在 Nuxt 中，可以使用 CSS 或 SASS 来为应用程序添加样式。

以下是如何在 Nuxt 中配置和使用 CSS 或 SASS 的详细步骤：

## 使用 CSS

### 全局 CSS

在 `nuxt.config.ts` 文件中配置全局 CSS。

将 CSS 文件放置在 `assets` 目录下，并在 `nuxt.config.ts` 文件中引用它们。

#### 创建 CSS 文件

创建 `assets` 目录，并在其中创建一个 CSS 文件，例如 `main.css`：

```css
/* assets/main.css */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f0f0f0;
}
```

#### 配置

- 可以在 `nuxt.config.ts` 文件中引入全局 CSS：

  ```typescript
  // nuxt.config.ts
  export default defineNuxtConfig({
    css: [
      '@/assets/main.css'
    ]
  })
  ```

- 或者也可以在 `app.vue` 文件用引用

    ::: code-group
    ```vue [script]
    <template>
      <div>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </template>
    <script setup>
    import("@/assets/main.css") // [!code ++]
    </script>
    ```

    ```vue [style]
    <template>
      <div>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </template>
    <style>
    @import "@/assets/main.css"; // [!code ++]
    </style>
    ```
    :::

### 局部 CSS

可以在组件、页面或布局文件中添加局部 CSS 样式。使用 `<style scoped>` 标签可以确保样式只作用于当前组件。

   ```vue
   <!-- components/MyComponent.vue -->
   <template>
     <div class="my-component">
       <...>
     </div>
   </template>
   <style scoped>
   .my-component {
     border: 1px solid #ccc;
     padding: 20px;
     border-radius: 5px;
     background-color: white;
   }
   </style>
   ```

## 使用 SASS/SCSS

### 安装依赖

首先，安装 SASS 依赖包：

```bash
npm install -D sass
```

### 全局 SASS

 将 SASS 文件放置在 `assets` 目录下，并在 `nuxt.config.ts` 文件中引用它们，或者在 `app.vue` 文件中引用它们。

#### 创建 SASS 文件

  ```scss
  /* assets/main.scss */
  $font-stack: Helvetica, sans-serif;
  $primary-color: #333;

  body {
    font-family: $font-stack;
    background-color: $primary-color;
  }
  ```

#### 配置

- 可以在 `nuxt.config.ts` 文件中引入全局 SASS 文件：

    ```typescript
    // nuxt.config.ts
    export default defineNuxtConfig({
        css: [
          '@/assets/main.scss'
        ]
    })
    ```

- 或者也可以在 `app.vue` 文件中引用

    ::: code-group
    ```vue [script]
    <!--app.vue-->
    <template>
      <div>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </template>
    <script setup>
      import('@/assets/main.scss');
    </script>
    ```
  
    ```vue
    <!--app.vue-->
    <template>
      <div>
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>
    </template>
    <style>
      import '@/assets/main.scss';
    </style>
    ```
    :::

### 局部 SASS

   可以在组件文件中添加局部 SASS 样式。使用 `<style scoped lang="scss">` 标签可以确保样式只作用于当前组件。

   ```vue
   <!-- components/MyComponent.vue -->
   <template>
     <div class="my-component">
      <...>
     </div>
   </template>

   <style scoped lang="scss">
   $border-color: #ccc;

   .my-component {
     border: 1px solid $border-color;
     padding: 20px;
     border-radius: 5px;
     background-color: white;
   }
   </style>
   ```

### 使用 SASS 的附加功能

可以在全局 SASS 文件中定义变量和混合，并在组件的 SASS 文件中使用它们。

- 创建一个 `variables.scss` 文件：

  ```scss
  /* assets/variables.scss */
  $primary-color: #333;
  $padding: 20px;
  ```

- 在全局 SASS 文件中导入变量：

  ```scss
  /* assets/main.scss */
  @import 'variables';

  body {
    font-family: Helvetica, sans-serif;
    color: $primary-color;
    padding: 0;
    background-color: #f0f0f0;
  }
  ```

- 在组件中使用变量：

  ```vue
  <!-- components/MyComponent.vue -->
  <template>
    <div class="my-component">
      <...>
    </div>
  </template>

  <style scoped lang="scss">
  @import '@/assets/variables';

  .my-component {
    border: 1px solid $primary-color;
    padding: $padding;
    border-radius: 5px;
    background-color: white;
  }
  </style>
  ```
  
## Tailwind CSS

在 Nuxt 中使用 [Tailwind CSS](https://tailwindcss.com/docs) 模块是非常方便的。Nuxt 提供了一个官方模块，可以简化配置过程。

### 安装

```bash
npm install -D @nuxtjs/tailwindcss
```

### 配置

在 `nuxt.config.ts` 文件中添加 `@nuxtjs/tailwindcss` 模块：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ['@nuxtjs/tailwindcss'], // [!code ++]
})
```

### 自定义配置

1. **生成 Tailwind 配置文件**

   如果你需要自定义 Tailwind 配置，可以生成 `tailwind.config.js` 文件：

   ```bash
   npx tailwindcss init
   ```

2. **配置 `tailwind.config.js`**

    ```javascript
    // tailwind.config.js
    /** @type {import('tailwindcss').Config} */
    export default {
        content: [
            './components/**/*.{vue,js}',
            './layouts/**/*.{vue,js}',
            './pages/**/*.{vue,js}',
            './plugins/**/*.{vue,js}',
            './nuxt.config.{js,ts}'
        ],
        theme: {
            extend: {},
        },
        plugins: [],
    }
    ```

更多的配置可以[查看官方网站](https://tailwindcss.nuxtjs.org/tailwind/config)。