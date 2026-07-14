# Vue 与 Nuxt 中的动态组件 {#dynamic-components-in-vue-and-nuxt}

在稍具规模的应用里，"按需切换组件"是一个反复出现的需求：用户切换标签页（tab）、全局状态变化时展示不同的仪表盘区块、根据业务逻辑渲染不同弹窗，或者最典型的——内容管理系统（CMS）返回一个组件名，前端需要动态渲染对应组件。

问题在于，实现方式不止一种，而每一种在**可读性、类型友好度、以及打包性能（chunk 拆分）**上的表现差别很大。

写得随意一点，就可能把上百个组件全部同步导入，拖垮首屏性能。

## Demo {#demo}

先搭一个最小场景。删掉 `pages/` 目录，让应用只跑 `app.vue`，再新建 `components/` 目录，放两个结构相同的组件用于切换。

::: code-group

```vue[components/DynamicComponent.vue]
<template>
  <h2>Dynamic Component View</h2>
</template>
```

```vue[components/AnotherDynamicComponent.vue]
<template>
  <h2>Another Dynamic Component View</h2>
</template>
```
:::

在 `app.vue` 里用一个复选框（checkbox）作为切换开关，并用 `v-model` 双向绑定：

```vue
<script setup lang="ts">
const isSwitched = ref(false)
</script>

<template>
  <label>
    <input type="checkbox" v-model="isSwitched">
    Switch to another dynamic component?
  </label>
</template>
```

这里有个 Nuxt 细节：因为是 Nuxt 应用，`ref` 无需从 `vue` 手动 import，自动导入（auto imports）已经处理好了；使用 `unplugin-auto-import` 的纯 Vue 项目同理。

## 一、`v-if` / `v-else` 直接切换 {#v-if-else}

最基础的做法就是条件渲染。两个组件都不多时，这样最直观：

```vue
<template>
  <AnotherDynamicComponent v-if="isSwitched" />
  <DynamicComponent v-else />
</template>
```

勾选复选框时渲染 `AnotherDynamicComponent`，否则渲染 `DynamicComponent`。Nuxt 的组件自动导入让这一步几乎零配置。

局限也很明显：如果组件类型来自 API/CMS，或者数量多到无法一一列举，`v-if` 就不再适用了——你没法为一百个可能的组件写一百个分支，而且它们全都会被静态导入。

## 二、`<component :is>` 与三种导入 {#dynamic-component-is}

真正"动态"的场景要用 Vue 内置的 `<component :is="...">`。它接收一个组件名或组件本身，并渲染之：

```vue
<template>
  <component :is="componentToRender" />
</template>
```

配一个 `computed` 决定渲染谁：

```ts
const componentToRender = computed(() =>
  isSwitched.value ? 'AnotherDynamicComponent' : 'DynamicComponent',
)
```

### 直接传字符串会"静默失败" {#silent-fail}

如果直接传组件名字符串，页面会渲染不出来，而且控制台**不报错**。

原因是：Vue 文档要求传入的必须是**已注册的组件**或**组件的导入引用**。

仅仅把组件放在 `components/` 目录并不等于在当前作用域注册了它。

此时 Vue 会把 `AnotherDynamicComponent` 当作自定义元素（custom element）原样渲染到 DOM，看起来"什么都没发生"。

打开 DevTools 能看到它确实以自定义元素形式存在，只是 Vue 没识别成组件。

### 2.1 显式导入 {#explicit-import}

最直接的修复是手动导入，再把 `computed` 里的字符串换成真正引用：

```ts
// 相对路径
import DynamicComponent from '~/components/DynamicComponent.vue'
// 或使用 Nuxt 的 #components 别名（Vue 中不可用）
import { AnotherDynamicComponent } from '#components'

const componentToRender = computed(() =>
  isSwitched.value ? AnotherDynamicComponent : DynamicComponent,
)
```

注意：从 `#components` 导入时要用**具名导入（named import）**而非默认导入，因为 Nuxt 把所有组件都挂在那里以具名形式导出。

缺点有两个：
1. 手动 import 会在文件顶部堆一堆导入语句（是否可接受属于个人偏好）；
2. 是**这些是同步导入**，两个组件都会被打进同一份 chunk。想象 CMS 里一百个组件全部同步导入，首屏负担会非常重。

### 2.2 `resolveComponent` {#resolve-component}

第三种导入方式是 Vue 提供的 `resolveComponent`，它能按名字解析已注册的组件，Vue 与 Nuxt 都可用：

```ts
const componentToRender = computed(() =>
  isSwitched.value
    ? resolveComponent('AnotherDynamicComponent')
    : resolveComponent('DynamicComponent'),
)
```

关键约束：`resolveComponent` 的参数必须是**明确的字符串字面量**，不能是表达式、语句或变量。

它能让代码工作，但同样是同步查找，性能问题依旧存在，而且到处写 `resolveComponent` 也不够优雅。

## 三、用 Lazy 前缀实现异步组件 {#lazy-prefix}

要解决同步导入的性能问题，就该请出异步组件（async components）。

在 Nuxt 里，只需给组件名加 `Lazy` 前缀即可，无需手动 `defineAsyncComponent`：

```ts
const componentToRender = computed(() =>
  isSwitched.value
    ? resolveComponent('LazyAnotherDynamicComponent')
    : resolveComponent('LazyDynamicComponent'),
)
```

这样每个组件会拿到**自己独立的 chunk**，按需加载。

打开 DevTools 按组件名过滤，可以看到切换时才加载对应的 chunk——`DynamicComponent` 是独立 chunk，勾选后才拉取 `AnotherDynamicComponent`。

`Lazy` 前缀背后其实就是 Vue 的 `defineAsyncComponent`，Nuxt 帮你自动包装了。

## 四、全局组件（Global Components）{#global-components}

如果不想到处写 `resolveComponent`，可以把组件注册为全局组件。

Vue 里通常是写一个插件用 `app.component()` 注册；Nuxt 提供两种更省事的约定。

### 4.1 `.global.vue` 后缀 {#global-vue-suffix}

给组件文件名加 `.global` 后缀，例如把 `AnotherDynamicComponent.vue` 改成 `AnotherDynamicComponent.global.vue`，它就成了全局组件。

之后 `app.vue` 里连 `resolveComponent` 都不用，直接传 `Lazy` 组件名字符串即可：

```vue
<template>
  <component :is="isSwitched ? 'LazyAnotherDynamicComponent' : 'LazyDynamicComponent'" />
</template>
```

有意思的是，即便没显式声明"也要提供懒加载版本"，Nuxt 会自动为全局组件提供 `Lazy` 变体。

### 4.2 `components/global/` 目录 {#global-directory}

第二种方式是新建 `components/global/` 目录，把组件挪进去，效果与后缀一致，同样可以去掉 `resolveComponent`。

### 全局组件的性能代价 {#performance-costs}

全局组件的 chunk 会**在页面加载时立即拉取**，而不是按需。刷新页面时能看到它们的 chunk 立刻被加载。因此：

- 适用：组件会在多个页面出现，或 CMS 场景下无法预知哪个组件会用到；
- 代价：每个全局组件各自独立成 chunk，难以自然分组（grouping），想优化性能需要额外的手动工作，且高度依赖项目情况。

## Nuxt 背后是怎么做的

想知道 `.global` 后缀和 `global/` 目录的原理，可以看 Nuxt 源码里 [`packages/nuxt/src/components/templates.ts`](https://github.com/nuxt/nuxt/tree/main/packages/nuxt/src/components/templates.ts#L54) 中的组件插件。

其中有一个 `nuxt:global-components` 插件，在 setup 里遍历所有全局组件，对每个执行类似：

```ts
nuxtApp.vueApp.component(name, component)
// 同时注册其 Lazy 版本
```

也就是说，Nuxt 底层做的事和在 Vue 应用里手动注册全局组件**完全一样**——只是把 `.global` 后缀或 `global/` 目录这层约定抽象掉了。

也可以自定义全局目录名、组件命名等，灵活度很高。

## 常见案例 {#common-cases}

把四种方式浓缩成一张选型表：

| 方式                                     | 适用场景           | 加载特性              | 备注                           |
|----------------------------------------|----------------|-------------------|------------------------------|
| `v-if` / `v-else`                      | 只有少数固定组件       | 同步、打进同一 chunk     | 最直观，但不适合大量或未知组件              |
| `<component :is>` + 显式导入               | 组件已知、数量可控      | 同步                | 顶部导入较多，`#components` 需具名导入   |
| `<component :is>` + `resolveComponent` | 按名字动态渲染        | 同步                | 参数必须是字符串字面量                  |
| `Lazy` 前缀（异步组件）                        | 组件较多、关注首屏      | 各自独立 chunk、按需加载   | 推荐搭配使用                     |
| 全局组件（`.global` / `global/`）            | 多页面复用、CMS 未知组件 | 独立 chunk、**立即加载** | 省去 `resolveComponent`，但难分组优化 |

落地步骤建议：

1. 组件少且固定，直接用 `v-if` / `v-else`。
2. 需要"按名渲染"时，用 `<component :is="componentToRender">` 配 `computed`。
3. 组件多或来自 CMS，优先加 `Lazy` 前缀，让每个组件独立成 chunk 按需加载。
4. 不想散落 `resolveComponent`，且组件确实跨页面复用，就用 `.global.vue` 或 `components/global/` 注册为全局组件。
5. 用 DevTools 按组件名过滤，验证 chunk 是"按需加载"还是"立即加载"，据此决定是否要做手动分组优化。

## 注意事项 {#cautions}

- **字符串传给 `:is` 会静默失败**：未注册的组件名会被当作自定义元素原样渲染，控制台不报错，排查时优先检查组件是否真正注册或导入。
- **`#components` 用具名导入**：Nuxt 把组件以具名形式从 `#components` 导出，写成默认导入会拿不到。
- **`resolveComponent` 只接受字符串字面量**：不能传变量或表达式，否则无法解析。
- **同步 vs 异步是性能分水岭**：显式导入和 `resolveComponent` 默认同步，组件一多就拖累首屏；`Lazy` 前缀让它们各自独立 chunk 按需加载。
- **全局组件会立即加载 chunk**：全局组件虽方便，但其 chunk 在页面加载时就拉取，且各自独立、难以分组优化，是否使用要结合项目权衡。
- **补充经验——别滥用全局注册**：全局组件会常驻应用实例，数量膨胀会拖慢启动并增加内存占用。除非确实跨页面高频复用或 CMS 场景，否则局部 + `Lazy` 通常是更可控的默认选择。
- **补充经验——给动态组件加兜底**：CMS 返回的组件名可能不存在，建议在 `computed` 里对未知名称做降级处理（如渲染占位或 fallback 组件），避免线上出现空白。