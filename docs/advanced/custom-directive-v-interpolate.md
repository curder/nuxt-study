# 自定义指令 `v-interpolate` {#custom-directive-v-interpolate}

通过自定义 Vue 指令拦截第三方 HTML 中的原生 `<a>` 标签，将其转化为 Nuxt 的客户端路由跳转，彻底解决富文本内容导致整页刷新的性能痛点。

在开发 Nuxt 应用时，经常需要处理来自 CMS 或远程 API 的富文本内容。

- **用户体验破碎**：默认的 `v-html` 渲染出的 `<a>` 标签会触发浏览器的全量刷新，导致单页应用（SPA）状态丢失。
- **性能损耗**：整页刷新意味着重新加载 JS、CSS 资源及初始化 Vue 实例，对移动端极不友好。
- **安全隐患**：直接使用 `v-html` 容易遭受 XSS 攻击。

| 特性 | 方案 A：原生 `v-html` | 方案 B：自定义 `v-interpolate` 指令 |
| :--- | :--- | :--- |
| **核心优势** | 零代码成本，Vue 原生支持 | **保留 SPA 体验**，内部链接实现无感跳转 |
| **潜在劣势** | 触发整页刷新，用户体验差 | 需要额外的指令封装和事件管理逻辑 |
| **复杂度** | 极低 | 中等（需处理 TypeScript 类型与事件代理） |
| **安全性** | 风险高（需配合 DOMPurify） | **可控**（可在指令内部集成净化逻辑） |
| **推荐场景** | 仅展示纯静态、无跳转的内容 | **CMS 博客、文档中心、营销活动页** |

## `v-interpolate` 指令 {#v-interpolate-directive}

遵循 Nuxt 最佳实践，我们通过客户端插件注册该指令，并利用**事件代理**提升性能。

```typescript
// plugins/interpolate.ts (注意去掉 .client 后缀，改为全栈插件)
import { defineNuxtPlugin, navigateTo } from '#app'
import type { Directive } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  const interpolateDirective: Directive = {
    // 1. 客户端逻辑：处理点击拦截
    mounted(el, binding) {
      el.innerHTML = binding.value ?? ''
      el.addEventListener('click', (e: MouseEvent) => {
        const target = (e.target as HTMLElement).closest('a')
        if (target && target instanceof HTMLAnchorElement) {
          const href = target.getAttribute('href')
          if (href && !href.startsWith('http') && !target.target) {
            e.preventDefault()
            navigateTo(href)
          }
        }
      })
    },
    // 2. 更新逻辑
    updated(el, binding) {
      if (binding.value !== binding.oldValue) {
        el.innerHTML = binding.value ?? ''
      }
    },
    // 3. 关键：服务端渲染逻辑
    // 告诉 Nuxt 服务端直接把内容渲染进 innerHTML 属性中
    getSSRProps(binding) {
      return {
        innerHTML: binding.value ?? ''
      }
    }
  }

  nuxtApp.vueApp.directive('interpolate', interpolateDirective)
})
```

## 实践案例 {#best-practices}

### 1. 基础用法：渲染 CMS 内容 {#basic-usage-render-cms-content}
在页面组件中，直接替换 `v-html` 为 `v-interpolate`。

```vue
<script setup lang="ts">
const content = `
<p>动态内容来自第三方，比如：API/CMS。</p>
<a href="/about">About us</a>
`;
</script>
<template>
  <div class="prose">
    <!-- 自动将 HTML 里的 <a> 标签转化为客户端导航 -->
    <div v-interpolate="article.content" />
  </div>
</template>
```

此时，再点击页面的 a 标签 `<a href="/about">` 将触发 Nuxt 的客户端路由跳转，而不是整页刷新。

### 2. 安全增强：集成 DOMPurify {#sanitize-html}
为了防止 XSS，建议在绑定前对 HTML 进行净化。

```typescript
// utils/security.ts
import DOMPurify from 'isomorphic-purify'

export const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'a', 'b', 'i', 'strong', 'em', 'ul', 'li', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'title', 'target']
  })
}

// 页面中使用
<div v-interpolate="sanitizeHtml(article.content)" />
```

### 3. 样式隔离：使用 CSS Scope {#style-scoping}
由于第三方 HTML 不受 Vue Scoped CSS 控制，建议使用 Tailwind 的 `prose` 类或深度选择器。

```vue
<style scoped>
/* 使用深度选择器为动态插入的链接添加样式 */
:deep(a) {
  @apply text-blue-600 underline hover:text-blue-800 transition-colors;
}
</style>
```

## 开发者避坑指南 {#developer-pitfalls-guide}

- **避坑点：事件解绑**  
  务必在 `unmounted` 钩子中移除事件监听器。如果页面中存在大量频繁切换的动态内容，未解绑的监听器会导致**内存泄漏**。
- **进阶技巧：预取（Prefetching）**  
  NuxtLink 的一大优势是自动预取。可以进一步增强指令：当鼠标悬停（`mouseenter`）在链接上时，调用 `useRouter().resolve(href)` 并触发对应页面的预取逻辑。