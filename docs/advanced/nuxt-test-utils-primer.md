# Nuxt 测试入门 {#nuxt-test-utils-primer}


测试对任何应用都很重要。当项目复杂到一定程度，纯手工点点点已经无法覆盖所有回归路径，遗漏的 bug 会随迭代不断累积。很多人对「在 Nuxt 里写测试」心存畏惧，觉得 SSR、自动导入（auto imports）、`useState` 等 Nuxt 特有机制会让测试难以下手。

**在 Nuxt 里写单元测试（Unit Test）和端到端测试（E2E Test）并没有想象中那么难**。

官方提供的 `@nuxt/test-utils` 把 Nuxt 运行环境、自动导入、组件挂载等都封装好了，配合 Vitest 与 Playwright，可以在很短时间内建立起分层的测试能力。

## 一、安装与配置 {#install-and-configure}

第一步是引入测试工具链。`@nuxt/test-utils` 依赖 Vitest 作为测试运行器，还需要相关的环境依赖：

```bash
npm install -D @nuxt/test-utils vitest @vue/test-utils happy-dom
```

随后在项目根目录配置 Vitest，关键是使用 test-utils 提供的 Nuxt 配置封装 `defineVitestConfig`，它会帮你搭好 Nuxt 的测试运行环境：

```ts
// vitest.config.ts
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    // 让测试跑在 Nuxt 环境中，自动导入、composables 等才能生效
    environment: 'nuxt'
  }
})
```

把 `environment` 设为 `'nuxt'` 是关键，只有这样，测试里才能像在真实应用中一样使用 Nuxt 的自动导入和内置 composables。

## 二、为组件写单元测试 {#unit-test-for-components}

以一个简单的 `AppNumber` 组件为例，单元测试的目标是**在隔离环境中挂载组件、断言其渲染与行为**。

test-utils 提供了 `mountSuspended` 来挂载支持异步/Nuxt 特性的组件：

```ts
// AppNumber.nuxt.spec.ts
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppNumber from '~/components/AppNumber.vue'

describe('AppNumber', () => {
  it('renders the number', async () => {
    const component = await mountSuspended(AppNumber)
    expect(component.text()).toContain('0')
  })
})
```

- **`mountSuspended`** 是 test-utils 对 Vue Test Utils `mount` 的增强版，能正确处理 Nuxt 组件里的异步 setup 与自动导入。
- 测试文件命名带 `.nuxt` 或将环境设为 nuxt，可确保它跑在 Nuxt 测试环境里。

## 三、单元测试中模拟状态 {#mock-useState}

组件常依赖 Nuxt 的 `useState` 管理跨组件状态。

测试时若想控制该状态的初始值或隔离副作用，就需要 mock。

test-utils 提供了 `mockNuxtImport` 来劫持自动导入的函数：

```ts
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

// 用受控的 ref 替换 useState 的实现
mockNuxtImport('useState', () => {
  return () => ref(42)
})
```

这样组件内部调用的 `useState` 会返回你预设的值，从而可以断言「给定某状态时组件如何渲染」。

`mockNuxtImport` 的价值在于**精准隔离 Nuxt 的自动导入依赖**，让单元测试聚焦于组件自身逻辑，而不被全局状态干扰。

## 四、断言渲染出的 HTML {#e2e-html-assertion}

除了组件级测试，还可以更贴近真实运行的 E2E 测试。

第一种方式是启动一个真实的 Nuxt 服务器，抓取某个路由渲染出的 HTML 并做断言，用 `setup` 与 `$fetch` 完成：

```ts
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('App E2E', async () => {
  // 启动一个真实的 Nuxt 测试服务器
  await setup({
    // 可指定 rootDir、server、browser 等选项
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('some expected content')
  })
})
```

- **`setup`** 来自 `@nuxt/test-utils/e2e`，负责启动/关闭测试用的 Nuxt 实例。
- **`$fetch`** 在这里请求页面并返回 HTML 字符串，适合验证 SSR 输出的内容是否正确。

## 五、Playwright驱动真实浏览器 {#e2e-playwright}

若要测试真正的浏览器交互（点击、输入、导航），可以结合 Playwright。

test-utils 提供了浏览器相关的辅助能力，配合 `createPage` 打开页面并操作 DOM：

```ts
import { describe, it, expect } from 'vitest'
import { setup, createPage } from '@nuxt/test-utils/e2e'

describe('Browser E2E', async () => {
  await setup({
    browser: true   // 启用浏览器模式
  })

  it('increments on click', async () => {
    const page = await createPage('/')
    // 通过 Playwright 的 API 定位元素并交互
    await page.getByRole('button').click()
    expect(await page.getByText('1').isVisible()).toBe(true)
  })
})
```

- **`browser: true`** 开启浏览器模式，底层用 Playwright 驱动真实浏览器渲染与交互。
- **`createPage`** 返回一个 Playwright 的 page 对象，可用其完整 API 做点击、断言可见性等真实用户操作，适合验证端到端的交互流程。

## 六、按文件设置测试环境 {#per-file-test-environment}

并非所有测试都需要完整的 Nuxt 环境，纯函数测试跑在 Nuxt 环境里反而更慢。

通过文件顶部的注释指令声明可以**按文件覆盖测试环境**：

```ts
// @vitest-environment nuxt
```

或者依赖命名约定：以 `.nuxt.spec.ts` 结尾的文件自动使用 Nuxt 环境，普通 `.spec.ts` 则用默认（更轻量）环境。

这样既能对需要 Nuxt 特性的测试提供完整环境，又能让简单测试保持快速。

## 注意事项 {#caution}

| 事项                          | 说明                                                       |
|-----------------------------|----------------------------------------------------------|
| **环境要设对**                   | 用到自动导入/composables 的测试必须跑在 `environment: 'nuxt'`。        |
| **挂载用 `mountSuspended`**    | 它能处理 Nuxt 组件的异步 setup 与自动导入，普通 `mount` 可能失败。             |
| **Mock 用 `mockNuxtImport`** | 专门劫持 Nuxt 自动导入函数（如 `useState`），隔离全局状态。                   |
| **E2E 分两档**                 | `$fetch` 验证 SSR 的 HTML，`createPage` + Playwright 验证真实交互。 |
| **`setup` 有开销**             | E2E 会真启动 Nuxt 实例，较慢；合理拆分、不要滥用。                           |
| **按文件选环境**                  | Nuxt 环境更重，简单纯函数测试用默认环境更快。                                |
| **单元 vs E2E 取舍**            | 单元测试快而聚焦，E2E 贴近真实但成本高，按金字塔比例分配。                          |

建议遵循「测试金字塔」，大量快速的单元测试打底，少量关键路径的 E2E 测试兜住核心流程，避免全靠 E2E 导致 CI 缓慢且脆弱。

此外，涉及网络请求的组件测试应把 `$fetch`/API 层也一并 mock，保证测试的确定性（deterministic），不因外部服务波动而随机失败。

Playwright 相关的 E2E 通常建议放在独立的测试脚本或 CI 阶段运行，与快速单元测试分开，以免拖慢日常开发反馈循环。

