# 样式 Styles {#styles}

Nuxt 4 的样式组织重点在于新的 `app/` 目录结构。应用相关代码默认集中在 `app/` 目录中，因此本地样式文件也推荐放在 `app/assets/` 下。

在 Nuxt 4 项目中，常见样式方案包括 CSS、SCSS 和 Tailwind CSS。推荐的组织方式是：

- 全局基础样式放在 `app/assets/styles/main.css` 或 `app/assets/styles/main.scss` 中；
- 组件自身样式写在组件内部；
- SCSS 变量、混入和函数通过 Vite 配置自动注入；
- Tailwind CSS 通过 Nuxt 模块统一安装和管理；
- `public/` 只放置不需要构建处理、需要固定 URL 访问的静态文件。

## Nuxt 4 样式目录约定 {#nuxt-4-style-conventions}

Nuxt 4 推荐将应用源码放在 `app/` 目录中。样式文件作为应用资源的一部分，通常放在 `app/assets/` 下。

### 推荐目录结构 {#recommended-style-structure}

```text
app/
  app.vue
  assets/
    styles/
      main.scss
      abstracts/
        _variables.scss
        _mixins.scss
  components/
    BaseButton.vue
    BaseCard.vue
  layouts/
    default.vue
  pages/
    index.vue
public/
  favicon.ico
  robots.txt
nuxt.config.ts
```

其中：

- `app/assets/styles/main.scss` 用于放置会真正输出 CSS 的全局样式；
- `app/assets/styles/abstracts/_variables.scss` 用于放置 SCSS 变量；
- `app/assets/styles/abstracts/_mixins.scss` 用于放置 SCSS 混入；
- `app/components/` 中的组件可以使用 scoped CSS 或 SCSS；
- `public/` 用于放置不经过构建处理的静态文件。

### 路径别名 {#path-alias}

在 Nuxt 4 中，可以使用 `~/assets/` 引用 `app/assets/` 下的资源。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  css: [
    '~/assets/styles/main.scss'
  ]
})
```

::: tip Nuxt 4 提示
在 Nuxt 4 中，`~/assets/styles/main.scss` 通常指向 `app/assets/styles/main.scss`。相比旧项目中常见的根目录 `assets/`，Nuxt 4 更推荐将应用相关资源放入 `app/assets/`。
:::

### assets 与 public 的区别 {#assets-vs-public}

Nuxt 4 中，`app/assets/` 和 `public/` 的职责不同。

| 目录 | 是否经过构建处理 | 适合放置 |
| --- | --- | --- |
| `app/assets/` | 是 | CSS、SCSS、字体、需要构建优化的图片 |
| `public/` | 否 | `favicon.ico`、`robots.txt`、固定 URL 的静态文件 |

放在 `public/` 中的文件可以通过站点根路径直接访问。例如：

```text
public/
  og-image.png
```

可以通过 `/og-image.png` 访问：

```vue
<script setup lang="ts">
useSeoMeta({
  ogImage: '/og-image.png'
})
</script>
```

而样式、字体、组件图片等通常建议放在 `app/assets/` 中，由构建工具处理：

```vue
<template>
  <img src="~/assets/images/logo.png" alt="Logo">
</template>
```

::: warning 注意
不要把需要被构建工具处理的样式文件放进 `public/`。`public/` 中的文件不会被压缩、指纹化或通过构建流程优化。
:::

## 全局样式 {#global-styles}

全局样式适合放置基础样式、CSS 变量、字体、重置样式和通用布局类。

### 创建全局样式文件 {#create-global-style-file}

```scss
/* app/assets/styles/main.scss */
:root {
  --color-primary: #2563eb;
  --color-text: #111827;
  --color-background: #ffffff;
}

html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}

body {
  margin: 0;
  color: var(--color-text);
  background-color: var(--color-background);
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.page-container {
  width: min(100% - 32px, 1200px);
  margin-inline: auto;
}
```

### 在 nuxt.config.ts 中引入 {#import-global-style-in-nuxt-config}

推荐通过 `nuxt.config.ts` 的 `css` 字段统一引入全局样式。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  css: [
    '~/assets/styles/main.scss'
  ]
})
```

也可以在 `app/app.vue` 或布局文件中引入，但全局基础样式更推荐集中配置。

```vue
<!-- app/app.vue -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang="scss">
@use '~/assets/styles/main.scss';
</style>
```

::: tip 最佳实践
如果样式需要在整个应用中生效，例如 `body`、字体、重置样式、CSS 变量，建议放入全局样式文件，并通过 `nuxt.config.ts` 的 `css` 字段引入。
:::

## 组件级样式 {#component-styles}

组件样式建议写在对应的 `.vue` 文件中。对于普通组件，优先使用 `<style scoped>` 限制样式作用范围。

### 使用 scoped 样式 {#using-scoped-style}

```vue
<!-- app/components/BaseCard.vue -->
<template>
  <article class="base-card">
    <h2 class="base-card__title">
      {{ title }}
    </h2>

    <div class="base-card__content">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style scoped>
.base-card {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background-color: #ffffff;
}

.base-card__title {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 700;
}

.base-card__content {
  color: #4b5563;
  line-height: 1.7;
}
</style>
```

### 使用 :deep() 影响子组件样式 {#using-deep-selector}

如果需要影响子组件内部结构，可以使用 `:deep()`。

```vue
<style scoped>
.article-page :deep(.rich-text h2) {
  margin-top: 32px;
  font-size: 28px;
}
</style>
```

::: warning 注意
`:deep()` 适合处理少量第三方组件或富文本内容样式，不建议大量使用。大量使用通常说明组件边界或样式组织需要重新设计。
:::

## 使用 SCSS {#using-scss}

Nuxt 支持 CSS 预处理器。使用 SCSS 前，需要先安装 Sass。

### 安装 Sass {#install-sass}

::: code-group

```bash [npm]
npm install -D sass
```

```bash [pnpm]
pnpm add -D sass
```

```bash [yarn]
yarn add -D sass
```

:::

### 在组件中使用 SCSS {#using-scss-in-components}

组件中可以直接使用 `lang="scss"`。

```vue
<!-- app/components/BaseButton.vue -->
<template>
  <button class="base-button" type="button">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  background-color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #1d4ed8;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}
</style>
```

## SCSS 变量和混入自动注入 {#auto-inject-scss}

在 Nuxt 4 项目中，不建议在每个组件中重复写：

```scss
@use '~/assets/styles/abstracts/variables' as *;
@use '~/assets/styles/abstracts/mixins' as *;
```

更推荐通过 `vite.css.preprocessorOptions` 自动注入变量、混入和函数。

### 创建变量文件 {#create-scss-variables}

```scss
/* app/assets/styles/abstracts/_variables.scss */
$color-primary: #2563eb;
$color-primary-hover: #1d4ed8;
$color-text: #111827;
$color-border: #e5e7eb;

$spacing-md: 16px;
$spacing-lg: 24px;

$radius-md: 8px;
$radius-lg: 12px;
```

### 创建混入文件 {#create-scss-mixins}

```scss
/* app/assets/styles/abstracts/_mixins.scss */
@mixin focus-ring {
  outline: 2px solid rgba(37, 99, 235, 0.4);
  outline-offset: 2px;
}

@mixin respond-md {
  @media (min-width: 768px) {
    @content;
  }
}
```

### 在 nuxt.config.ts 中自动注入 {#inject-scss-in-nuxt-config}

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  css: [
    '~/assets/styles/main.scss'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "~/assets/styles/abstracts/variables" as *;
            @use "~/assets/styles/abstracts/mixins" as *;
          `
        }
      }
    }
  }
})
```

### 在组件中直接使用变量和混入 {#use-injected-scss-in-components}

配置完成后，组件中可以直接使用变量和混入。

```vue
<!-- app/components/BaseAlert.vue -->
<template>
  <div class="base-alert">
    <slot />
  </div>
</template>

<style scoped lang="scss">
.base-alert {
  padding: $spacing-md;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  color: $color-text;
  background-color: #ffffff;

  &:focus-within {
    @include focus-ring;
  }

  @include respond-md {
    padding: $spacing-lg;
  }
}
</style>
```

::: tip 最佳实践
自动注入的 SCSS 文件应该只包含变量、函数、混入等不会直接生成 CSS 的内容。不要把普通选择器样式放进 `additionalData`，否则可能导致样式在多个组件中重复输出。
:::

## SCSS 变量与 CSS 变量 {#scss-vs-css-variables}

SCSS 变量和 CSS 变量适合不同场景。

### 使用 SCSS 变量的场景 {#when-to-use-scss-variables}

SCSS 变量在构建时生效，适合固定的设计 token。

```scss
$radius-lg: 12px;
$spacing-md: 16px;
```

适合放置：

- 固定间距；
- 固定圆角；
- 固定断点；
- 构建期不会变化的设计值。

### 使用 CSS 变量的场景 {#when-to-use-css-variables}

CSS 变量在运行时生效，适合主题切换、深色模式、多租户主题等场景。

```scss
:root {
  --color-text: #111827;
  --color-background: #ffffff;
}

.dark {
  --color-text: #f9fafb;
  --color-background: #030712;
}
```

组件中可以组合使用 SCSS 变量和 CSS 变量。

```vue
<style scoped lang="scss">
.theme-card {
  padding: $spacing-md;
  border-radius: $radius-lg;
  color: var(--color-text);
  background-color: var(--color-background);
}
</style>
```

::: tip 最佳实践
固定设计值使用 SCSS 变量；需要运行时切换的颜色、主题和状态值使用 CSS 变量。
:::

## 使用 Tailwind CSS {#tailwind-css}

Tailwind CSS 适合处理高频、直接的视觉样式，例如布局、间距、颜色、字号、响应式和状态样式。

### 安装 Tailwind CSS {#install-tailwind-css}

在 Nuxt 4 中使用 Tailwind CSS，推荐通过 Nuxt 模块安装。

```bash
npx nuxi module add tailwindcss
```

安装完成后，通常会自动将模块加入 `nuxt.config.ts`。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ]
})
```

::: tip 最佳实践
文档中建议统一使用 `npx nuxi module add tailwindcss`，避免同时出现手动安装依赖、手动修改配置和 CLI 添加模块多种写法。
:::

### 在组件中使用 Tailwind CSS {#using-tailwind-css-in-components}

```vue
<!-- app/components/HeroSection.vue -->
<template>
  <section class="bg-slate-950 px-6 py-24 text-white">
    <div class="mx-auto max-w-5xl">
      <p class="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-300">
        Nuxt 4
      </p>

      <h1 class="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
        使用 Nuxt 4 构建现代 Web 应用
      </h1>

      <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        通过清晰的 app 目录结构、组件化开发和灵活的样式系统，构建可维护的前端应用。
      </p>
    </div>
  </section>
</template>
```

### Tailwind CSS 与组件样式的边界 {#tailwind-and-component-styles}

Tailwind CSS 适合处理常规 UI 样式。例如按钮的布局、颜色、间距和状态样式：

```vue
<template>
  <button
    type="button"
    class="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <slot />
  </button>
</template>
```

当样式逻辑较复杂，例如伪元素、复杂动画、第三方组件覆盖或富文本内容时，可以保留组件级 CSS/SCSS。

```vue
<template>
  <button type="button" class="glow-button">
    <slot />
  </button>
</template>

<style scoped>
.glow-button {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 999px;
  padding: 12px 24px;
  color: #ffffff;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  font-weight: 700;
  cursor: pointer;
}

.glow-button::before {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(
    120deg,
    transparent,
    rgba(255, 255, 255, 0.35),
    transparent
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.glow-button:hover::before {
  transform: translateX(100%);
}
</style>
```

::: tip 最佳实践
使用 Tailwind CSS 并不意味着完全放弃 CSS/SCSS。页面布局和常规样式优先使用 Tailwind，复杂组件样式仍然可以使用 scoped CSS 或 SCSS。
:::

## 推荐配置示例 {#recommended-configuration}

下面是一个适合 Nuxt 4 的样式配置示例，包含全局 SCSS、SCSS 自动注入和 Tailwind CSS 模块。

### nuxt.config.ts {#nuxt-config-example}

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],

  css: [
    '~/assets/styles/main.scss'
  ],

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `
            @use "~/assets/styles/abstracts/variables" as *;
            @use "~/assets/styles/abstracts/mixins" as *;
          `
        }
      }
    }
  }
})
```

### 目录结构 {#directory-structure-example}

```text
app/
  app.vue
  assets/
    styles/
      main.scss
      abstracts/
        _variables.scss
        _mixins.scss
  components/
    BaseButton.vue
    BaseCard.vue
  layouts/
    default.vue
  pages/
    index.vue
public/
  favicon.ico
  robots.txt
nuxt.config.ts
```

### main.scss {#main-scss-example}

```scss
/* app/assets/styles/main.scss */
:root {
  --color-primary: #2563eb;
  --color-text: #111827;
  --color-background: #ffffff;
}

body {
  margin: 0;
  color: var(--color-text);
  background-color: var(--color-background);
}
```

### 组件示例 {#component-example}

```vue
<!-- app/components/BasePanel.vue -->
<template>
  <section class="rounded-xl bg-white p-6 shadow-sm">
    <h2 class="base-panel__title">
      <slot name="title" />
    </h2>

    <div class="mt-4 text-slate-600">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.base-panel__title {
  margin: 0;
  color: $color-text;
  font-size: 20px;
  font-weight: 700;
}
</style>
```

## 样式实践清单 {#style-best-practices}

Nuxt 4 项目中，样式组织建议遵循以下原则：

1. 应用样式文件放在 `app/assets/`，不要继续沿用根目录 `assets/` 的旧习惯。
2. 全局样式通过 `nuxt.config.ts` 的 `css` 字段统一引入。
3. 组件样式优先使用 `<style scoped>`，减少全局污染。
4. SCSS 公共变量、混入和函数通过 `vite.css.preprocessorOptions` 自动注入。
5. 自动注入的 SCSS 文件不要包含会生成 CSS 的选择器。
6. Tailwind CSS 安装方式统一使用 `npx nuxi module add tailwindcss`。
7. Tailwind CSS 适合处理常规 UI 样式，复杂动画和伪元素仍可使用组件级 CSS/SCSS。
8. 主题切换、深色模式等运行时样式优先使用 CSS 变量。
9. 不要滥用 `!important`，优先通过组件边界和样式层级解决问题。
10. 同一个组件的样式来源应尽量集中，避免同时散落在全局样式、Tailwind CSS、scoped 样式和内联样式中。
