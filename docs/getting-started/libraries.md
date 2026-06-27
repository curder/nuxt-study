---
aside: 'left'
outline: 
  level: 
    - 2
    - 3
    - 4
---

# 常用代码库 {#common-code-libraries}

当开始一个新的 Nuxt 项目时，通常需要配置样式方案、图片优化、字体、图标、代码规范、测试、SEO、内容管理等能力。这里整理一些常用的 Nuxt 模块和工具库，方便在项目初始化时快速选择。

::: tip Nuxt Modules 安装约定
Nuxt 官方模块通常可以通过 `npx nuxi module add <name>` 一键安装。该方式会安装依赖，并自动更新 `nuxt.config.ts`，推荐优先使用，以便与 [Nuxt Modules](https://nuxt.com/modules) 生态保持一致。

例如：

```bash
npx nuxi module add tailwindcss
npx nuxi module add vueuse
npx nuxi module add image
npx nuxi module add eslint
```

对于非 Nuxt 模块类型的工具库，例如测试工具包或普通 npm 包，则根据官方文档使用包管理器安装。
:::

## 样式与 UI {#styles-and-ui}

这一类工具主要用于处理样式、图片、字体、图标、主题和动画，是大多数 Nuxt 项目都会考虑的基础能力。

### Nuxt Tailwind {#nuxt-tailwind}

Tailwind CSS 是常用的原子化 CSS 框架，适合快速构建页面布局、响应式样式和组件视觉样式。

#### 推荐安装 {#install-tailwind}

```bash [nuxi]
npx nuxi module add tailwindcss
```

#### 包管理器安装 {#install-tailwind-with-package-manager}

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

#### 配置示例 {#tailwind-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ]
})
```

更多配置和使用方法跳转到 [官方文档](https://tailwindcss.nuxtjs.org/)。

### Nuxt Image {#nuxt-image}

Nuxt Image 用于图片自动优化，支持图片尺寸调整、格式转换、懒加载、响应式图片和不同图片服务提供商。对于博客、官网、电商、内容站等包含大量图片的项目，建议优先配置该模块。

#### 推荐安装 {#install-image}

```bash [nuxi]
npx nuxi module add image
```

#### 包管理器安装 {#install-image-with-package-manager}

::: code-group

```bash [yarn]
yarn add -D @nuxt/image
```

```bash [npm]
npm install -D @nuxt/image
```

```bash [pnpm]
pnpm i -D @nuxt/image
```

:::

#### 配置示例 {#image-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/image'
  ],
  image: {
    // options here
  }
})
```

#### 使用示例 {#image-usage-example}

```vue
<template>
  <NuxtImg
    src="/images/cover.jpg"
    alt="文章封面"
    width="1200"
    height="630"
    format="webp"
  />
</template>
```

也可以使用 `<NuxtPicture>` 输出更灵活的响应式图片：

```vue
<template>
  <NuxtPicture
    src="/images/cover.jpg"
    alt="文章封面"
    format="avif,webp"
  />
</template>
```

更多配置和使用方法跳转到 [官方文档](https://image.nuxt.com/)。

### Nuxt Fonts {#nuxt-fonts}

Nuxt Fonts 用于优化 Web 字体加载，支持自动处理字体资源，减少手动配置字体文件和加载策略的成本。

#### 推荐安装 {#install-fonts}

```bash [nuxi]
npx nuxi module add fonts
```

#### 包管理器安装 {#install-fonts-with-package-manager}

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

#### 配置示例 {#fonts-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/fonts'
  ]
})
```

使用 Nuxt Fonts 后，通常需要将 `.data` 添加到 `.gitignore` 文件中。

更多配置和使用方法跳转到 [官方文档](https://fonts.nuxtjs.org/)。

### Nuxt Icon {#nuxt-icon}

Nuxt Icon 是 Nuxt 的图标模块，包含大量来自 Iconify 的可用图标，适合在项目中快速接入统一的图标方案。

#### 推荐安装 {#install-icon}

```bash [nuxi]
npx nuxi module add icon
```

#### 使用示例 {#icon-usage-example}

```vue
<template>
  <Icon name="lucide:home" />
</template>
```

更多配置和使用方法跳转到 [官方文档](https://nuxt.com/modules/icon)。

### Nuxt Color Mode {#nuxt-color-mode}

Nuxt Color Mode 用于实现暗色模式和亮色模式，支持自动检测系统主题，也可以手动切换主题。

#### 推荐安装 {#install-color-mode}

```bash [nuxi]
npx nuxi module add color-mode
```

#### 配置示例 {#color-mode-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/color-mode'
  ]
})
```

更多配置和使用方法跳转到 [官方文档](https://color-mode.nuxtjs.org/)。

### Auto Animate {#auto-animate}

AutoAnimate 是一款无需复杂配置的动画工具，可以为列表、条件渲染、元素增删等场景添加流畅的过渡效果。

#### 包管理器安装 {#install-auto-animate}

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

#### 配置示例 {#auto-animate-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@formkit/auto-animate/nuxt'
  ]
})
```

更多配置和使用方法跳转到 [官方文档](https://auto-animate.formkit.com/#usage-vue)。

## 开发效率与代码质量 {#developer-experience-and-code-quality}

这一类工具主要用于提升开发效率、统一代码规范和补充测试能力，适合在项目早期就完成配置。

### VueUse {#vueuse}

VueUse 提供了大量 Vue Composition API 工具函数，例如浏览器状态、事件监听、存储、传感器、动画等，适合提升日常开发效率。

#### 推荐安装 {#install-vueuse}

```bash [nuxi]
npx nuxi module add vueuse
```

#### 包管理器安装 {#install-vueuse-with-package-manager}

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

#### 配置示例 {#vueuse-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt'
  ]
})
```

更多配置和使用方法跳转到 [官方文档](https://vueuse.org/guide/#installation)。

### Nuxt ESLint {#nuxt-eslint}

Nuxt ESLint 用于为 Nuxt 项目配置代码规范检查，适合在团队项目中统一代码风格并提前发现潜在问题。

#### 推荐安装 {#install-eslint}

```bash [nuxi]
npx nuxi module add eslint
```

#### 包管理器安装 {#install-eslint-with-package-manager}

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

#### 配置示例 {#eslint-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint'
  ],
  eslint: {
    // options here
  }
})
```

更多配置和使用方法跳转到 [官方文档](https://eslint.nuxt.com/)。

### Nuxt Test Utils {#nuxt-test-utils}

`@nuxt/test-utils` 是 Nuxt 官方测试工具，用于编写 Nuxt 应用的单元测试、组件测试和端到端测试。它通常会与 Vitest、Vue Test Utils、happy-dom 或 Playwright 一起使用。

::: warning 注意
`@nuxt/test-utils` 更偏测试工具包，不是常规页面功能模块。它通常通过包管理器安装，而不是添加到 `nuxt.config.ts` 的 `modules` 中。
:::

#### 包管理器安装 {#install-test-utils}

::: code-group

```bash [yarn]
yarn add -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

```bash [npm]
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

```bash [pnpm]
pnpm i -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

:::

如果需要端到端测试，可以额外安装 Playwright：

::: code-group

```bash [yarn]
yarn add -D playwright
```

```bash [npm]
npm install -D playwright
```

```bash [pnpm]
pnpm i -D playwright
```

:::

#### 配置示例 {#test-utils-config-example}

可以在 `vitest.config.ts` 中配置 Nuxt 测试环境：

```ts
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt'
  }
})
```

在 `package.json` 中添加测试脚本：

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

更多配置和使用方法跳转到 [官方文档](https://nuxt.com/docs/getting-started/testing)。

## 内容、SEO 与第三方脚本 {#content-seo-and-scripts}

这一类工具主要用于内容管理、搜索引擎优化和第三方脚本加载，适合博客、文档站、官网、营销站和内容型应用。

### Nuxt SEO {#nuxt-seo}

Nuxt SEO 用于为 Nuxt 项目配置 SEO 能力，适合处理站点地图、robots、结构化数据、OG 信息等搜索引擎优化需求。

#### 推荐安装 {#install-seo}

```bash [nuxi]
npx nuxi module add @nuxtjs/seo
```

#### 包管理器安装 {#install-seo-with-package-manager}

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

#### 配置示例 {#seo-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/seo'
  ]
})
```

更多配置和使用方法跳转到 [官方文档](https://nuxtseo.com/docs/nuxt-seo/getting-started/introduction)。

### Nuxt Scripts {#nuxt-scripts}

Nuxt Scripts 用于更安全、可控地加载第三方脚本，例如统计分析、客服组件、广告脚本等，适合需要管理外部脚本加载时机和性能影响的项目。

#### 推荐安装 {#install-scripts}

```bash [nuxi]
npx nuxi module add scripts
```

更多配置和使用方法跳转到 [官方文档](https://scripts.nuxt.com/)。

### Nuxt Content {#nuxt-content}

Nuxt Content 会读取项目中的 `content/` 目录，解析 `.md`、`.yml`、`.csv` 和 `.json` 文件，为应用创建内容数据层。使用 MDC 语法还可以在 Markdown 中使用 Vue 组件。

#### 推荐安装 {#install-content}

```bash [nuxi]
npx nuxi module add content
```

#### 配置示例 {#content-config-example}

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/content'
  ],
  content: {
    // options here
  }
})
```

更多配置和使用方法跳转到 [官方文档](https://content.nuxtjs.org/)。

## 选型建议 {#library-selection-suggestions}

如果是一个常规 Nuxt 项目，可以优先考虑以下组合：

| 场景 | 推荐工具 |
| --- | --- |
| 样式开发 | Nuxt Tailwind |
| 图片优化 | Nuxt Image |
| 字体优化 | Nuxt Fonts |
| 图标方案 | Nuxt Icon |
| 暗色模式 | Nuxt Color Mode |
| 组合式工具函数 | VueUse |
| 代码规范 | Nuxt ESLint |
| 测试 | Nuxt Test Utils |
| SEO | Nuxt SEO |
| 内容管理 | Nuxt Content |
| 第三方脚本 | Nuxt Scripts |

对于中大型项目，建议在项目初始化阶段就配置 Nuxt ESLint、Nuxt Test Utils、Nuxt Image 和 Nuxt SEO。这样可以更早统一代码质量、测试体系、图片性能和搜索引擎优化能力。
