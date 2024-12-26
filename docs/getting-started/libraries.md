# 常用代码库

当开始一个新的 nuxt 项目时，有很多事情需要设置， linting、测试、最佳实践等等，这里列出一些常用的代码库。

## Nuxt Tailwind

### 自动安装

```bash [nuxi]
npx nuxi@latest module add tailwindcss
```

### 手动安装

::: code-group

```bash [yarn]
yarn add -D @nuxtjs/tailwindcss
```

```bash [npm]
npm install -D @nuxtjs/tailwindcss
```

```bash [pnpm]
pnpm i -D @nuxtjs/tailwindcss
```

:::

在 `nuxt.config.ts` 中添加以下内容：

```ts
export default defineNuxtConfig({
    modules: ['@nuxtjs/tailwindcss']
})
```

更多配置和使用方法跳转到[官方文档](https://tailwindcss.nuxtjs.org/)。

## VueUse

### 自动安装

```bash [nuxi]
npx nuxi@latest module add vueuse
```

### 手动安装

::: code-group

```bash [yarn]
yarn add -D @vueuse/nuxt @vueuse/core
```

```bash [npm]
npm i -D @vueuse/nuxt @vueuse/core
```

```bash [pnpm]
pnpm i -D @vueuse/nuxt @vueuse/core
```

:::

在 `nuxt.config.ts` 中添加以下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@vueuse/nuxt',
    ],
})
```

更多配置和使用方法跳转到[官方文档](https://vueuse.org/guide/#installation)。

## Nuxt ESLint

### 自动安装

```bash [nuxi]
npx nuxi module add eslint
```

### 手动安装

::: code-group

```bash [yarn]
yarn add -D @nuxt/eslint eslint typescript
```

```bash [npm]
npm install -D @nuxt/eslint eslint typescript
```

```bash [pnpm]
pnpm i -D @nuxt/eslint eslint typescript
```

:::

在 `nuxt.config.ts` 中添加以下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@nuxt/eslint'
    ],
    eslint: {
        // options here
    }
})
```

更多配置和使用方法跳转到[官方文档](https://eslint.nuxt.com/)。

## Nuxt Fonts

### 自动安装

```bash [nuxi]
npx nuxi@latest module add fonts
```

### 手动安装

::: code-group

```bash [yarn]
yarn add -D @nuxt/fonts
```

```bash [npm]
npm install -D @nuxt/fonts
```

```bash [pnpm]
pnpm i -D @nuxt/fonts
```

:::

在 `nuxt.config.ts` 中添加以下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@nuxt/fonts',
    ]
})
```

并且需要将 `.data` 添加到 `.gitignore` 文件中。

更多配置和使用方法跳转到[官方文档](https://fonts.nuxtjs.org/)。

## Nuxt SEO

### 自动安装

```bash [nuxi]
npx nuxi module add @nuxtjs/seo
```

### 手动安装

::: code-group

```bash [yarn]
yarn add -D @nuxtjs/seo
```

```bash [npm]
npm install -D @nuxtjs/seo
```

```bash [pnpm]
pnpm i -D @nuxtjs/seo
```

:::

在 `nuxt.config.ts` 中添加以下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@nuxtjs/seo',
    ]
})
```

更多配置和使用方法跳转到[官方文档](https://nuxtseo.com/docs/nuxt-seo/getting-started/introduction)。

## Nuxt Scripts

```bash [nuxi]
npx nuxi@latest module add scripts
```

更多配置和使用方法跳转到[官方文档](https://scripts.nuxt.com/)。

## Nuxt Icon

Nuxt 的图标模块，包含超过 200,000 个来自 [Iconify](https://iconify.design/) 的可立即使用的图标。

```bash [nuxi]
npx nuxi module add icon
```

更多配置和使用方法跳转到[官方文档](https://nuxt.com/modules/icon)。

## Nuxt Color Mode

使用 Nuxt 轻松实现自动检测的暗色和亮色模式。

```bash [nuxi]
npx nuxi module add color-mode
```

在 `nuxt.config.ts` 中添加如下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@nuxtjs/color-mode'
    ]
})
```

更多配置和使用方法跳转到[官方文档](https://color-mode.nuxtjs.org/)。

## Nuxt Content

Nuxt Content 读取项目中的 `content/` 目录，解析 `.md`、`.yml`、`.csv` 和 `.json` 文件，为应用程序创建强大的数据层。

使用 MDC 语法还可以在 Markdown 中使用 `Vue` 组件。

```bash [nuxi]
npx nuxi module add content
```

在 `nuxt.config.ts` 中添加如下内容：

```ts
export default defineNuxtConfig({
    modules: [
        '@nuxt/content'
    ],
    content: {
        // ... options
    }
})
```

更多配置和使用方法跳转到[官方文档](https://content.nuxtjs.org/)。

## Auto Animate

AutoAnimate 是一款无需配置的嵌入式动画实用程序，可为 Web 应用添加流畅的过渡效果。

::: code-group

```bash [yarn]
yarn add -D @formkit/auto-animate
```

```bash [npm]
npm install -D @formkit/auto-animate
```

```bash [pnpm]
pnpm i -D @formkit/auto-animate
```

:::

在 `nuxt.config.ts` 中添加如下内容：

```ts
export default defineNuxtConfig({
    modules: ['@formkit/auto-animate/nuxt'],
})
```

更多配置和使用方法跳转到[官方文档](https://auto-animate.formkit.com/#usage-vue)。
