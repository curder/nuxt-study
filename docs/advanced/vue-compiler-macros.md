# Vue 中的编译器宏（Compiler Macros）{#vue-compiler-macros}

在使用 Vue 3 的组合式 API（Composition API）配合 `script setup` 语法时，会发现一个有趣的现象：`ref`、`reactive` 这些 API 必须手动导入，但 `defineProps`、`defineEmits`、`defineModel` 等却完全不需要。

即使没有启用 Nuxt 的自动导入（Auto Imports），在纯 Vue 项目中也是如此。

这背后涉及一个核心概念：**编译器宏（Compiler Macros）**。

它们不是普通的 JavaScript 函数，而是 Vue 编译器在编译阶段识别并处理的"语法糖"，最终会被编译掉，不会出现在运行时代码中。

理解这个机制，不仅能解释"为什么不需要 import"，也能帮助你在遇到 `defineProps` 导入报错时快速定位问题。

## 回到没有 `script setup` 的时代 {#before-script-setup}

要理解编译器宏为何存在，需要回到组合式 API 刚推出时的写法。

在 `script setup` 出现之前，组件长这样：

```vue
<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  setup() {
    const message = ref('Hello World')
    return {
      message,
    }
  },
})
</script>
```

`setup()` 是一个手动编写的函数，所有在模板中用到的变量都要 `return` 出去。

## `script setup` 的编译原理 {#how-script-setup-compiles}

`script setup` 的本质是让编译器自动生成 `setup()` 函数。

当你在 [Vue Playground](https://play.vuejs.org/) 中查看编译产物时，会看到类似这样的结构：

```js
// 编译后的 JavaScript 产物（简化）
import { defineComponent, ref } from 'vue'

const __sfc__ = defineComponent({
    setup() {
        const message = ref('Hello World')
        return {
            message,
        }
    },
})
```

但问题随之而来：**在 `script setup` 中，如何访问 props、emits 等组件选项？** 没有 `setup(props)` 的参数传递了，props 从哪来？

## 编译器宏的诞生 {#birth-of-compiler-macros}

答案就是编译器宏。

以 `defineProps` 为例：

```vue
<script setup lang="ts">
const props = defineProps<{
  text: string
}>()
</script>
```

不需要写 `import { defineProps } from 'vue'`，实际上，手动导入反而会被 Vue 的 ESLint 规则标记为不推荐（discouraged），新项目甚至会直接报错。

原因在于：`defineProps` 不是一个真正的运行时函数。

它只是给编译器的"提示"（hint），编译器看到它后，会把它转换成等价的 props 定义并注入到编译产物的组件选项中：

```js
// 编译产物中，defineProps 被替换为真实的 props 定义
const __sfc__ = {
  props: {
    text: String,
  },
  setup(__props) {
    const props = __props
    // ...
  },
}
```

> 编译器宏（Compiler Macros）是 Vue SFC 编译器（`@vue/compiler-sfc`）在编译阶段识别的特殊标识符。
> 
> 它们不会被打包进最终的运行时产物，因此也不需要从任何包中导入。
> 
> 这与 Nuxt 的自动导入机制完全不同，后者是通过 Unimport 在构建时注入真实的 `import` 语句。

## Vue 内置的编译器宏 {#built-in-compiler-macros}

Vue 核心内置了以下编译器宏：

| 宏名称          | 用途                                      | 引入版本 |
|-----------------|-------------------------------------------|----------|
| `defineProps`   | 声明组件的 props                          | Vue 3.0  |
| `defineEmits`   | 声明组件的自定义事件                      | Vue 3.0  |
| `defineExpose`  | 暴露组件内部方法/属性给父组件             | Vue 3.0  |
| `withDefaults`  | 为 props 设置默认值                       | Vue 3.0  |
| `defineOptions` | 设置组件选项（如 `name`、`inheritAttrs`） | Vue 3.3  |
| `defineSlots`   | 声明插槽的类型                            | Vue 3.3  |
| `defineModel`   | 声明双向绑定的 model                      | Vue 3.4  |

`withDefaults` 在新版 Vue 中已不太需要，因为可以直接对 props 解构赋默认值：

```vue
<script setup lang="ts">
const { text = 'default value' } = defineProps<{
  text?: string
}>()
</script>
```

## defineModel：为开发者体验而生 {#define-model-for-dx}

大部分宏的引入是为了补齐 `script setup` 相对于 `setup()` 函数的能力，props、emits、expose 等原本可以通过参数获取。

但 `defineModel` 不同，它纯粹是为了改善开发者体验（DX）。

在 `defineModel` 出现之前，实现一个 `v-model` 需要手动声明 prop 和 emit：

```vue
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="props.modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
```

这种写法不仅冗长，而且 prop 与 emit 之间的耦合关系不够直观。使用 `defineModel` 后：

```vue
<script setup lang="ts">
const model = defineModel<string>()
</script>

<template>
  <input v-model="model" />
</template>
```

编译器会自动生成 `modelValue` prop 和 `update:modelValue` emit，并通过 `mergeModels` 将它们与 `defineProps` 声明的普通 props 合并。修改 `model.value` 会自动触发 `update:modelValue` 事件。

`defineModel` 也支持命名 model：

```vue
<script setup lang="ts">
const dogName = defineModel<string>('dogName')
</script>
```

编译后会生成 `dogName` prop 和 `update:dogName` emit。

> `defineModel` 返回的是一个 `ModelRef`，本质上是 ref，可以直接 `.value` 读写。
> 
> 与普通 ref 的区别在于，写入时会自动触发对应的 emit 事件，实现双向绑定。
> 
> 在处理 reactive 对象与 ref 混用时有一些注意事项，但整体体验比手动拼装 prop + emit 提升巨大。

## 在组件中正确使用编译器宏 {#using-compiler-macros-in-components}

- 声明 props 并使用类型标注

    ```vue
    <script setup lang="ts">
    const props = defineProps<{
      text: string
      count?: number
    }>()
    </script>

    <template>
      <div>{{ props.text }}</div>
    </template>
    ```

    不需要 import `defineProps`，手动导入反而会触发 ESLint 警告。

- 声明 `emits`

    ```vue
    <script setup lang="ts">
    const emit = defineEmits<{
      close: []
      submit: [value: string]
    }>()
    </script>

    <template>
      <button @click="emit('submit', 'hello')">submit</button>
    </template>
    ```

- 使用 defineOptions 设置组件选项

    ```vue
    <script setup>
    defineOptions({
      name: 'MyComponent',
      inheritAttrs: false,
    })
    </script>
    ```

    `defineOptions` 让你在 `script setup` 中设置那些原本只能在 `export default` 对象中定义的选项。

- 使用 defineModel 实现双向绑定

    ```vue
    <!-- ChildComponent.vue -->
    <script setup lang="ts">
    const model = defineModel<string>()
    </script>

    <template>
      <input v-model="model" />
    </template>
    ```

    ```vue
    <!-- ParentComponent.vue -->
    <script setup>
    import { ref } from 'vue'
    import ChildComponent from './ChildComponent.vue'

    const value = ref('')
    </script>

    <template>
      <ChildComponent v-model="value" />
    </template>
    ```

- **使用 defineExpose 暴露方法**

    ```vue
    <script setup>
    import { ref } from 'vue'

    const count = ref(0)
    const increment = () => count.value++

    defineExpose({ count, increment })
    </script>
    ```

    父组件通过 `ref` 访问子组件时，只能拿到 `expose` 出去的内容。

- **尝试 Vue Macros 的单行 prop 声明**

    ```vue
    <script setup>
    // 需要安装 vue-macros 并配置
    const text = defineProp('text')   // 单个 prop
    const emitClose = defineEmit('close')  // 单个 emit
    </script>
    ```

    这是 Vue Macros 提供的实验性语法，尚未进入 Vue 核心。

## 注意事项 {#caveats}

- **不要手动导入编译器宏。**

  `defineProps`、`defineEmits` 等不需要也不应该从 `vue` 包导入。
 
  手动导入在部分版本中会触发 ESLint 错误或编译器警告，因为它们不是真实的运行时导出。

- **编译器宏只在 `script setup` 中有效。**
 
  在普通的 `export default { setup() {} }` 写法中，这些宏不可用，因为只有在 `script setup` 编译流程中编译器才会识别它们。

- **`defineModel` 需要 Vue 3.4+。**
 
  早期版本（3.3）有实验性支持但 API 不稳定；3.4 之后为稳定版。
 
  如果项目使用 Nuxt，确保依赖版本满足要求。
 
- **`withDefaults` 在新版本中可省略。** 
 
  Vue 3.5+ 支持直接对 props 解构赋默认值，不再需要 `withDefaults` 包装。 
 
- **Vue Macros 是实验性的。** 
 
  使用前确认项目 Vue 版本和构建工具兼容性。虽然它集成了 Volar 支持，但实验性宏可能随版本变更，生产环境需谨慎评估。
 
- **Reactivity Transform 已废弃。** 
 
  不要再新项目中使用 `$ref`、`$computed` 等语法；已有代码应迁移回标准 `ref().value` 写法。
- **编译器宏与自动导入是两套机制。** 
 
  Nuxt 的自动导入通过 Unimport 在构建时注入真实 `import` 语句（如 `ref`），而编译器宏是通过 SFC 编译器在编译阶段转换的。
  两者机制完全不同，不要混淆。
 
- **在 Vue Playground 中观察编译产物是最佳学习方式。** 
  通过查看编译后的 JavaScript 代码来讲解宏的工作原理，这是理解编译器魔法最直观的方法。