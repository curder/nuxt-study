# 避免在 Vue 中失去响应性 {#avoid-losing-reactivity-in-vue}

响应式（Reactivity）是 Vue 应用的核心机制：数据变化能自动触发视图更新和依赖重算。

但自从 Composition API 普及后，一个反复出现的问题浮现出来——很多人在跨 `composable`、跨组件传递数据时，会在不知不觉中**丢失响应式**，导致数据变了、界面却纹丝不动，且不报错，排查起来格外痛苦。

响应式丢失的根源几乎都是同一件事：**把「响应式引用」拆成了「普通的值」**。

Vue 的响应式建立在对象的引用追踪之上，一旦你通过解构、取值、赋值等操作把值从响应式容器里「拎」出来，追踪链路就断了。

理解「响应式是如何被追踪的，又在何处丢失」，是写出健壮 Vue 代码的前提。

## 一、ref 的响应式丢失 {#ref-reactivity-loss}

`ref` 用于包装基本类型或任意值，其响应式依赖于对 `.value` 的访问与赋值。丢失往往发生在你把 `.value` 提前取出、脱离了 `ref` 本身的时刻。

**典型错误：提前解出 `.value`**

```ts
import { ref } from 'vue'

const count = ref(0)

// ❌ 此刻就把值取出，赋给了一个普通变量
let plain = count.value

count.value++      // count 变了
console.log(plain) // 依然是 0，plain 与 count 已无关联
```

一旦读取 `count.value` 并赋给 `plain`，`plain` 只是拿到了那一瞬间的数字快照，之后 `count` 再怎么变都与它无关。

**正确做法：传递 `ref` 本身，在使用处才解 `.value`**

```ts
// ✅ 传递整个 ref，保持引用
const count = ref(0)

function useCount(source) {
  // 在真正需要时才访问 .value
  return computed(() => source.value * 2)
}

const double = useCount(count) // count 变化时 double 自动更新
```

**衍生场景：从 composable 返回时也要保持 `ref`**

```ts
// composables/useCounter.ts
export function useCounter() {
  const count = ref(0)
  const increment = () => count.value++
  // ✅ 返回 ref 本身，而不是 count.value
  return { count, increment }
}
```

只要消费方拿到的仍是 `ref`，模板里用（自动解包）或脚本里用 `.value`，响应式链路都保持完整。

## 二、reactive 与解构导致的响应式丢失 {#reactive-reactivity-loss}

`reactive` 返回一个响应式代理对象（Proxy），追踪的是**对该对象属性的访问**。最经典的坑就是**解构**：一旦解构，属性值被拷贝成普通变量，Proxy 无从拦截，响应式立刻消失。

**典型错误：直接解构 reactive 对象**

```ts
import { reactive } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// ❌ 解构后 count、name 是普通值，脱离了 Proxy 追踪
const { count, name } = state

state.count++        // state.count 变为 1
console.log(count)   // 仍然是 0
```

**解决方案一：不解构，始终通过对象访问**

```ts
// ✅ 通过 state.xxx 访问，追踪不断裂
const state = reactive({ count: 0 })
const doubled = computed(() => state.count * 2)
state.count++ // doubled 正常更新
```

**解决方案二：需要解构时用 `toRefs` / `toRef`**

`toRefs` 会把 `reactive` 对象的每个属性都转成一个 `ref`，从而在解构后仍保留响应式连接：

```ts
import { reactive, toRefs, toRef } from 'vue'

const state = reactive({ count: 0, name: 'Vue' })

// ✅ 解构出来的每一项都是 ref，响应式保留
const { count, name } = toRefs(state)

state.count++         // count.value 同步变为 1
console.log(count.value) // 1

// 只需要单个属性时用 toRef
const justCount = toRef(state, 'count')
```

## 三、props 的响应式丢失 {#props-reactivity-loss}

`props` 本质上是一个 `reactive` 对象，因此它继承了 `reactive` 的全部解构陷阱。这是组件开发中最高频的翻车点。

**典型错误：在 `setup` 里解构 props**

```ts
// ❌ 解构 props 会切断与父组件的响应式连接
const props = defineProps<{ modelValue: string }>()
const { modelValue } = props

// 父组件更新 modelValue 后，这里的 modelValue 不会变
```

**解决方案一：保持 `props.xxx` 的访问形式**

```ts
const props = defineProps<{ modelValue: string }>()

// ✅ 计算属性内部访问 props.modelValue，追踪正常
const upper = computed(() => props.modelValue.toUpperCase())
```

**解决方案二：用 `toRef` / `toRefs` 从 props 中安全地取值**

```ts
import { toRef, toRefs } from 'vue'

const props = defineProps<{ modelValue: string; disabled: boolean }>()

// ✅ 保留响应式的单个属性
const modelValue = toRef(props, 'modelValue')

// 或批量转换
const { disabled } = toRefs(props)
```

需要基于 prop 派生本地状态时，不要直接拷贝一个初始值就完事，而应结合 `computed` 或 `watch`，或使用 `toRef` 保持与源头的联动。

Vue 3.5+ 提供了响应式解构 props 的编译器特性，可在 `script setup` 中直接 `const { modelValue } = defineProps(...)` 而不丢失响应式（由编译器在底层改写为 `props.modelValue` 访问）。

但在旧版本或普通 `reactive` 对象上，仍需遵循上述 `toRefs` / `toRef` 规则。

## 常见案例 {##common-cases}

1. **ref 优先整体传递**：把 `ref` 作为整体在函数、composable 之间传递，只在真正读写时才触碰 `.value`。
2. **composable 返回 ref 而非值**：`return { count }` 而不是 `return { count: count.value }`。
3. **reactive 不要解构**：需要用属性时写 `state.count`；确需解构时套一层 `toRefs(state)`。
4. **props 不要直接解构**：模板/计算属性里用 `props.xxx`，或用 `toRef(props, 'key')` 取出单项。
5. **派生数据用 computed**：任何「基于响应式源推导出的值」都交给 `computed`，天然保持联动。
6. **单属性用 toRef，多属性用 toRefs**：按需选择，避免不必要的转换开销。

## 注意事项 {#caution}

| 事项                     | 说明                                            |
|------------------------|-----------------------------------------------|
| **响应式追踪的是「访问」**        | `reactive`/`props` 依赖对属性的访问拦截，一旦解构成普通变量即失效。   |
| **`.value` 是双刃剑**      | `ref` 通过 `.value` 追踪，提前取出 `.value` 赋给普通变量会断链。 |
| **props 本质是 reactive** | 别把它当普通对象解构，`toRef`/`toRefs` 是安全出口。            |
| **`toRefs` 只处理已存在的属性** | 对象上后加的新属性不会被 `toRefs` 自动包含，需重新处理。             |
| **优先 computed 派生**     | 与其手动同步，不如让 `computed` 自动重算，减少出错面。             |
| **善用工具辅助排查**           | 数据变了视图不动、又不报错时，第一反应应怀疑「某处解构断链」。               |
