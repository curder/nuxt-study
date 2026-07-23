# Vue 与 Nuxt 中的自动导入 {#vue-nuxt-auto-imports-good-and-bad}

在 Vue 生态（尤其是 Nuxt）的开发中， **自动导入（Auto Imports）** 是一个颇具争议的话题，有人爱它，有人恨它。

争议的核心在于：它能让代码更简洁，但也会带来隐式行为和可维护性方面的隐患。

需要解决的痛点主要有两个：一是手写大量 `import`
语句带来的"样板代码（boilerplate）"噪音，二是组件、组合式函数（composables）越来越多时，导入行数膨胀、信号噪声比下降。

自动导入的初衷，就是让开发者在不显式书写 `import` 的情况下，直接使用来自 Vue、Nuxt 或自身项目目录中的组件与函数。

不过，这种"省心"也伴随着代价：代码来源变得隐式、新人上手更难、重命名/重构时 IDE 无法自动联动更新。

理解它的原理、配置方式以及取舍，是合理使用的前提。

## 自动导入的三种类型 {#types-of-auto-imports}

自动导入在 Nuxt 中大致可以拆成三类，理解这个划分有助于后续配置和排查问题。

| 类型                      | 说明                                                   | 典型示例                                     |
|---------------------------|--------------------------------------------------------|----------------------------------------------|
| 组件（Components）        | 基于目录结构自动注册的 Vue 组件                        | `MyComponentA`、`AppComponentB`              |
| 文件/函数（Files）        | 来自 composables、utils、shared 等目录的导出函数与变量 | `useThisFile()`、`ref`、`useFetch`           |
| 第三方包/模块（Packages） | Nuxt 模块或 npm 包注入的自动导入                       | Vue 的 `ref`/`watch`、Nuxt 的 `useAsyncData` |

第一类组件自动导入可以追溯到 Nuxt 2，当时就有一个选项，可以基于目录结构自动注册组件。

第二类则针对 composables、utils、shared 等目录下的实际函数导出。

第三类是第三方包或 Nuxt 模块自行定义的自动导入，例如 Nuxt 默认会把 Vue 包本身的导出（如 `ref`）自动注入，使用者无需手写
`import { ref } from 'vue'`。

## 组件自动导入 {#showcasing-component-auto-imports}

在一个接近最小化的 Nuxt 应用中，`nuxt.config` 几乎不需要任何配置，开箱即用。

目录下有一个 `components/MyComponentA.vue`，内容仅渲染一段文字：

```vue
<!-- components/MyComponentA.vue -->
<template>
  <div>my component a</div>
</template>
```

在 `app.vue` 中，传统写法需要手动导入：

```vue
<!-- app.vue -->
<script setup>
  import MyComponentA from './components/MyComponentA.vue'
</script>

<template>
  <MyComponentA/>
</template>
```

而借助自动导入，可以直接删除 `import` 行，IDE 不会报错，浏览器中也正常渲染。

更关键的是，即使组件有必填 props，IDE 仍会给出类型错误提示，也就是说，类型支持并没有因为省略导入而丢失。

这一点与早期的自动导入方案不同，过去虽然能跑，但缺少完整的类型（type）支持，现在已经补齐。

嵌套目录同样有效。例如 `components/app/ComponentB.vue` 会被自动命名为 `AppComponentB`，组件名基于其在目录结构中的位置生成。

这样可以用嵌套目录组织组件，而无需手写冗长的导入路径：

```vue
<!-- 无需手动导入，直接使用 -->
<AppComponentB/>
```

与之相对，手写导入会变成：

```js
import AppComponentB from './components/app/ComponentB.vue'
```

当组件数量多时，这类导入行会非常嘈杂，可读性下降。

## 太多手动导入的问题 {#too-many-manual-imports}

Vue 组合式 API（Composition API）RFC 中 Evan You 重构的一个组件。

该组件的 `<script setup>` 顶部有近 20 行 `import`，大量重复地导入 `ref`、`reactive`、`watch` 等 Vue 内置 API。

这些 API 本就属于 Vue，开发者都清楚 `ref` 是什么、来自哪里。

既然如此，自动导入把它们注入进来、省掉这些行，是合理的。

这种"已知来源、无需重复声明"的导入，正是自动导入最擅长的场景。

## 组合式函数的自动导入 {#auto-importing-composables}

自定义组合式函数同样可以自动导入。

假设在 composables 目录下有一个 `useThisFile`，在 `app.vue` 中直接写：

```vue

<script setup>
  const result = useThisFile()
</script>
```

无需手写 `import`，IDE 仍会提示参数缺失等类型错误，补上参数后即可正常工作。

点击跳转定义时，默认会跳到 Nuxt 的 `imports.d.ts` 类型声明文件；借助 Anthony Fu 的 VS Code 扩展，可以直接跳转到源文件本身，查看真实实现。

`my-composables.ts` 中的导出（如 `useMyComposable`）也同理可用。

默认的 Nuxt/Nitro 内置组合式函数（`useFetch`、`useAsyncData`）默认自动导入，但也可以选择手动导入，两种方式都支持。

如果需要扩展自动导入的范围（例如从 `logic/`、`data/`、`services/` 等非默认目录导入，或从其他 npm 包导入），可以在
`nuxt.config` 中通过 `imports` 选项自定义目录和导入模式。

## 自动导入的缺点 {#downsides-of-auto-imports}

优点比较直观：样板代码更少、可读性更高、信噪比更好。但缺点集中在大项目和"来源不明确"的场景。

**隐式行为导致可读性与上手成本上升。** 默认导入如 `ref`、`watch`、`useFetch` 来源清晰，问题出在大量自定义组合式函数上：
`useThisFile`、`useMyComposable` 这类命名相近的函数，不看定义根本不知道来自哪个文件、哪个包。如果再叠加 VueUse
等组件库自带的组合式函数，来源会更加模糊。对新人（或一周后的自己）而言，代码的隐式行为越多，阅读和定位成本越高。

**重构时 IDE 无法联动更新。** 当重命名一个自动导入的源文件（例如 `useThisFile.ts` → `useThisOtherFile.ts`）时，使用处会报
"cannot find useThisFile"，因为自动导入名称是基于文件名生成的。虽然 TypeScript 能给出错误，但需要手动修复，而手动导入的场景下，VS
Code 可以自动跟踪并批量更新重命名。

根本原因在于：自动导入的底层库与 VS Code 之间没有建立明确的"链接"关系，IDE
并不感知某个标识符实际来自哪个文件，因此无法做到"文件改名 → 使用处自动同步"。

## Unimport：自动导入的底层引擎 {#unimport}

驱动 Nuxt 等项目自动导入能力的底层库叫 **Unimport**。它不绑定 Vue，可以用于任何 JavaScript/TypeScript 项目。其核心机制是通过遍历
AST 或正则匹配策略，扫描指定目录或包的导出，并在代码中使用到这些标识符时自动注入对应的 `import` 语句。

Nuxt 的 `nuxt.config` 中 `imports` 相关选项（如设置导入目录、配置导入模式数组等），本质上就是透传给 Unimport 的。因此你在
Nuxt 配置里看到的一些选项，和 Unimport 的能力是一一对应的。

## Unplugin 系统：把自动导入带到非 Nuxt 项目 {#unplugin-system}

如果项目不是 Nuxt（没有内置自动导入），可以借助 **unplugin** 体系自行接入。unplugin 是一套统一的插件系统，支持
Vite、Webpack、Rspack、Vue CLI、Rollup 等多种构建工具，写一次插件即可跨构建工具复用。

针对组件自动导入，对应的是 **unplugin-vue-components**；针对函数/变量自动导入，对应的是 **unplugin-auto-import**（内部使用
Unimport）。安装并按所用构建工具配置后，即可在普通 Vue 项目中获得与 Nuxt 类似的自动导入体验，包括目录自定义、Vue preset 等选项。

## 在 Nuxt 中禁用自动导入 {#disabling-auto-imports-in-nuxt}

如果权衡后认为缺点更重（例如希望重构行为更可控、或项目未使用 TypeScript 导致类型提示缺失），可以分步关闭自动导入。关闭时同样按三类来处理。

### 1. 关闭自身代码（composables/utils 等）的自动导入 {#disabling-auto-imports-in-nuxt-step-1}

在 `nuxt.config` 中通过 `imports` 选项将 `scan` 设为 `false`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    imports: {
        scan: false,
    },
})
```

这样 `useThisOtherFile` 这类自定义组合式函数不再自动可用，需要手动导入（注意默认导出需手动处理）：

```vue

<script setup>
  import useThisOtherFile from '~/composables/useThisOtherFile'
</script>
```

此时来自 Vue/Nuxt 的 `ref` 等仍然可用。

### 2. 关闭 Vue/Nuxt 内置 API 的自动导入 {#disabling-auto-imports-in-nuxt-step-2}

将 `imports` 直接设为 `false`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    imports: false,
})
```

这会覆盖模块、utils 等所有自动导入来源。此时 `ref` 也需要手动导入：

```vue

<script setup>
  import {ref} from 'vue'
</script>
```

注意：如果之前的代码里通过类型 `Ref` 手动从 vue 导入过，关闭后这些地方也可能受影响，需一并检查。

### 3. 关闭组件的自动导入

上面两步完成后，组件仍然会被自动导入。

需要在 `nuxt.config` 中新增 `components` 对象，并将其 `dirs` 设为空数组：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    components: {
        dirs: [],
    },
})
```

之后 `MyComponentA`、`AppComponentB` 会变成"未知"标识符，由于它们可能被当作自定义元素，TypeScript
不一定报错，但浏览器中不会渲染。需要手动导入才能恢复：

```vue

<script setup>
  import MyComponentA from '~/components/MyComponentA.vue'
  import ComponentB from '~/components/app/ComponentB.vue'
</script>

<template>
  <MyComponentA/>
  <AppComponentB/> <!-- 嵌套目录名需手动拼接前缀 -->
</template>
```

> 由于关闭后组件名不再自动生成，嵌套目录组件需要自己拼出 `App` 前缀或直接用导入的变量名，操作时务必逐个确认，避免遗漏导致页面空白。

## 借助 ESLint 模块平滑迁移 {#eslint-module-for-migrating}

如果希望从自动导入迁移到显式导入，Anthony Fu 提供了一个 ESLint 模块 **nuxt-eslint-auto-explicit-import**
，安装后会自动为每个原本自动导入的标识符插入显式 `import` 语句。这能显著降低迁移成本，也适合用来确保项目不再依赖隐式导入。

## 个人取舍建议 {#personal-take}

**对来源明确的、显而易见的 API 启用自动导入；对来源不明的自定义内容谨慎使用。**

具体而言：

- `ref`、`watch` 等 Vue 内置 API、`useFetch`/`useAsyncData` 等 Nuxt
  内置组合式函数、以及结构清晰的组件，自动导入是"无需思考"的合理选择。
- 大量自定义的小组合式函数、来源不明的工具函数，如果全部自动导入，会让人（尤其新人）难以判断来源，这时更应该显式导入或做好约定。
- 判断标准不是"作为资深开发者我自己知不知道"，而是"一个刚接触项目的人能不能快速定位到定义"。

## 常见案例：从启用到关闭的可执行步骤 {#common-cases}

以下把视频中的关键操作浓缩为可执行步骤。

**案例一：在普通 Vue 项目中引入组件自动导入**

1. 安装 `unplugin-vue-components`。
2. 在 Vite（或对应构建工具）配置中注册插件。
3. 指定需要扫描的组件目录（默认 `src/components`）。
4. 在 `.vue` 文件中直接使用组件名，无需 `import`。

**案例二：在普通 Vue 项目中引入函数自动导入**

1. 安装 `unplugin-auto-import`。
2. 在构建工具配置中注册插件，开启 `vue` preset。
3. 按需配置要包含的文件、目录和忽略项。
4. 直接使用 `ref`、`computed` 等标识符，插件会在构建时注入导入语句。

**案例三：在 Nuxt 中关闭所有自动导入**

1. 在 `nuxt.config.ts` 中设置 `imports: false`，关闭 Vue/Nuxt API 与自身代码的自动导入。
2. 设置 `components: { dirs: [] }`，关闭组件自动导入。
3. 全局搜索并补齐手动 `import`：API 从 `vue`/`#imports` 导入，组件从对应路径导入。
4. 在浏览器中逐页验证，确认无遗漏（关闭后未导入的组件不会报错但也不会渲染）。

**案例四：平滑迁移到显式导入**

1. 安装 Anthony Fu 的 `nuxt-eslint-auto-explicit-import`。
2. 运行 ESLint fix，自动为所有自动导入标识符插入显式 `import`。
3. 检查 diff，确认注入的导入路径正确。
4. 此后可选择保留或关闭自动导入配置。

## 注意事项 {#caveats}

- **类型支持是亮点也是前提。** 当前自动导入已具备完整类型支持，缺失必填 props 会正常报错；但若项目未使用
  TypeScript，类型层面的安全保障会大幅减弱，关闭自动导入的动机也更强。
- **重构要人工兜底。** 重命名自动导入的源文件后，使用处不会自动同步，需手动修复；手动导入则可借助 IDE
  自动重命名。这一点是自动导入与显式导入在工程化体验上最实质的差距。
- **跳转定义默认指向类型文件。** 点击自动导入的标识符默认跳到 `imports.d.ts`，而非源文件；安装 Anthony Fu 的 VS Code
  扩展可改为直接跳源文件，排查问题时更高效。
- **关闭组件自动导入后不会报错。** 未导入的组件可能被当成自定义元素，TypeScript
  不报错但页面不渲染，务必逐个验证，避免"看起来没问题但实际空白"。
- **嵌套目录组件名规则。** 自动导入的组件名基于目录路径生成（如 `components/app/ComponentB.vue` → `AppComponentB`
  ）；关闭后需手动拼接前缀或手动导入，命名规则要团队统一。
- **Nitro 层的来源混淆。** Nuxt / Nitro / H3 叠加时，自动导入会放大"不知道函数来自哪一层"的问题；对服务端相关函数尤其要留意来源，必要时显式导入以便查文档。
- **适度而非全量。** 对显而易见、来源清晰的 API 大胆用自动导入；对来源模糊、高度自定义的部分保持显式导入，以此兼顾简洁与可维护性。