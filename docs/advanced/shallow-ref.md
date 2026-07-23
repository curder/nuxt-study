# Vue 3 中的 shallowRef {#vue-3-shallowref}

`shallowRef` 只对「整体替换」触发响应，牺牲深层响应换取性能，适合信号（Signals）实现与大体量 API 数据的存储场景。

在 Vue 3 组合式 API（Composition API）里，`ref` 与 `reactive` 是最常见的两个响应式原语。它们的共同特点是「深层响应」，对象内部任意层级的属性发生变化，都会触发依赖更新。

深层响应用起来很省心，但代价是：Vue 需要为对象的每一层建立 Proxy 拦截。

当数据结构非常庞大（例如一次接口返回上千条记录、上百个字段），或者你明确知道「这份数据只会整体替换、不会被就地修改」时，深层代理就变成了纯粹的性能负担。

`shallowRef`（以及配套的 `shallowReactive`、`shallowReadonly`）正是为这种场景准备的：**只在 `.value` 被整体替换时触发更新，内部属性怎么改都不通知**。

## shallowRef 到底做了什么 {#shallowref-what-does-it-do}

### 与 ref 的核心差异 {#ref-vs-shallowref}

用一个反直觉的 `counter` 例子最容易看清区别。状态不是直接存数字，而是存一个包着 `count` 的对象：

```js
import { ref } from 'vue'

const state = ref({ count: 0 })

function increment() {
  state.value.count++   // ref：深层响应，视图更新
}
```

把 `ref` 换成 `shallowRef`：

```js
import { shallowRef } from 'vue'

const state = shallowRef({ count: 0 })

function increment() {
  state.value.count++   // shallowRef：不触发更新，视图纹丝不动
}
```

想让 `shallowRef` 触发更新，必须替换整个 `.value`：

```js
state.value = { count: state.value.count + 1 }
```

或者在无法替换的场景下，手动强制触发：

```js
import { triggerRef } from 'vue'
triggerRef(state)
```

下面是 `ref` 与 `shallowRef` 的对照表：

| 特性                 | `ref`       | `shallowRef`         |
|--------------------|-------------|----------------------|
| 深层属性变更触发更新         | ✅           | ❌                    |
| 整体替换 `.value` 触发更新 | ✅           | ✅                    |
| 大对象性能开销            | 高（层层 Proxy） | 低（只包一层）              |
| 典型用途               | 常规响应式状态     | 大数据 / 不可变状态 / 外部状态桥接 |

## 主要使用场景 {#main-use-cases}

`shallowRef` 不是用来替代 `ref` 的日常方案，而是两个明确赛道的性能优化工具：

1. **接入外部状态管理 / 实现信号（Signals）**：状态天然通过「替换」而非「修改」传播。
2. **数据获取（Data Fetching）**：API 返回的数据体积大，通常只有再次请求时才会整体替换。

### 场景一：用 shallowRef 手写一个 Signals API {#signals-api-with-shallowref}

Signals 是 React、Angular、Solid 目前都在推的响应式模型，各大框架也正在探讨标准化。Vue 中可以用 `shallowRef` 干净地实现出来：

```js
import { shallowRef, triggerRef } from 'vue'

export function createSignal(value, options = {}) {
  const r = shallowRef(value)

  const get = () => r.value
  const set = (v) => {
    r.value = typeof v === 'function' ? v(r.value) : v
    if (options.equals === false) {
      triggerRef(r)
    }
  }

  return [get, set]
}
```

在组件中使用：

```vue
<script setup>
import { createSignal } from './signal'

const [count, setCount] = createSignal(0)
</script>

<template>
  <!-- 注意：count 是 getter 函数，模板里要调用 -->
  <button @click="setCount(count() + 1)">
    {{ count() }}
  </button>
</template>
```

这里之所以能安全使用 `shallowRef`：值只通过 setter 替换，永远不会被就地修改，因此深层响应完全多余。

`options.equals === false` 分支借助 `triggerRef` 处理「即使新旧值相等也要通知订阅者」的需求。

### 场景二：VueUse 的 useFetch {#vueuse-usefetch}

VueUse 里的 `useFetch` 内部就把 `response`、`data`、`error` 都存进了 `shallowRef`：

```js
// 简化后的 VueUse 源码片段
const response = shallowRef(null)
const data = shallowRef(null)
const error = shallowRef(null)

// 请求完成时始终是整体替换
response.value = res
data.value = transformed
```

响应体只在下一次请求或参数变化时被整体替换，中间不会被逐字段修改，这正是 `shallowRef` 的完美用例。

### 场景三：Nuxt 3 的 useAsyncData / useFetch {#nuxt-3-useasyncdata-usefetch}

Nuxt 3.8 起为 `useAsyncData` 和 `useFetch` 引入了新的 `deep` 选项：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  experimental: {
    defaults: {
      useAsyncData: {
        deep: false,
      },
    },
  },
})
```

- 默认 `deep: true`，保持向后兼容（内部使用 `ref`）。
- 设为 `false` 后内部改用 `shallowRef`，`data` 和 `error` 变成浅层响应。
- `useFetch` 底层就是 `useAsyncData`，因此这条配置同时对两者生效。

对于绝大多数 Nuxt 应用来说，接口数据的使用模式就是「拿到 → 渲染 → 下次请求整体替换」，因此把 `deep: false` 设为项目默认，几乎零改造就能拿到性能收益。

## 两种触发更新方式对照 {#two-update-ways}

`shallowRef` 的更新有两条路径：**替换 `.value`**（常规路径）与 **`triggerRef` 强制触发**（兜底路径）。

**能换引用就换引用，换不了再 `triggerRef`。**

| 触发方式          | 适用场景                                | 是否需要新引用  | 是否忽略新旧值相等  |
|-------------------|-----------------------------------------|-----------------|---------------------|
| 替换 `.value`     | 绝大多数常规更新                        | ✅ 必须是新引用 | ❌ 引用不变则不触发 |
| `triggerRef(ref)` | 就地修改后强制通知 / 新旧值相等仍需通知 | ❌ 不需要       | ✅ 无条件触发       |

### 案例一：计数器展开后替换 {#counter-with-spread}

```js
import { shallowRef } from 'vue'

const state = shallowRef({ count: 0 })

function increment() {
  // ✅ 展开旧对象，生成新引用
  state.value = { ...state.value, count: state.value.count + 1 }
}
```

对比 `triggerRef` 的写法：

```js
function incrementByTrigger() {
  state.value.count++    // 就地修改，引用未变
  triggerRef(state)      // 手动通知
}
```

前者是「数据驱动」的思路，后者更像是「事件驱动」的补丁——日常代码优先选前者，可读性和可预测性都更好。

### 案例二：列表增删，用新数组代替 `push` {#list-add-remove-with-new-array}

```js
const list = shallowRef([{ id: 1, name: 'A' }])

// ❌ 不会触发更新：数组引用没变
list.value.push({ id: 2, name: 'B' })

// ✅ 生成新数组，触发更新
list.value = [...list.value, { id: 2, name: 'B' }]

// ✅ 删除同理
list.value = list.value.filter(item => item.id !== 1)
```

这也是把 `shallowRef` 与 immutable 风格结合得最自然的场景：所有变更都产生新引用，正好命中浅层响应的触发条件。

### 案例三：接口数据，请求完成后整体替换 {#api-data-replace-on-fetch}

```js
const data = shallowRef(null)

async function refresh() {
  const res = await $fetch('/api/list')
  // ✅ 整体替换，天然触发更新
  data.value = transform(res)
}
```

因为响应体从来不会被就地修改，只会在下一次请求时整体替换，`shallowRef` 与「替换触发」几乎是一对天生的搭档。

### 案例四：Signals setter，替换式赋值 {#signals-setter-replace}

```js
const set = (v) => {
  // ✅ 无论传值还是传函数，最终都是替换 r.value
  r.value = typeof v === 'function' ? v(r.value) : v
  if (options.equals === false) {
    triggerRef(r)   // 仅在需要「相等也通知」时兜底
  }
}
```

正常路径是替换 `.value`；`triggerRef` 只服务于 `equals: false` 这种边缘语义。

### 什么时候真的只能用 `triggerRef` {##when-to-use-triggerref}

- 数据结构过大，克隆一份新引用的开销比深响应还高（例如几十万条的表格缓冲区）。
- 使用第三方库返回的实例对象（如 `Map`、`Set`、图形库的 scene 对象），无法通过展开生成等价副本。
- 明确需要「新旧值相等也通知」的语义，比如广播式事件源。

## 实操清单 {#practical-checklist}

1. 数据结构较大且只做「整体替换」时，优先选 `shallowRef`。
2. 变更时用展开语法（`{ ...old, key: val }` / `[...old, item]`）产生新引用，走替换触发路径。
3. 无法替换或需要强制通知时，用 `triggerRef(refObj)` 兜底。
4. 想实现 Signals 风格 API（getter / setter 解构）时，用 `shallowRef` 作为底层容器。
5. 在 Nuxt 项目里，通过 `experimental.defaults.useAsyncData.deep = false` 让 `useFetch` / `useAsyncData` 默认走浅层响应。
6. 直接使用 VueUse 的 `useFetch` 即可自动享受浅层响应带来的性能红利。
7. 需要对象类型的浅层响应，用 `shallowReactive`；需要只读的浅层响应，用 `shallowReadonly`。

## 常见坑与注意事项 {##common-pitfalls-and-notes}

- **改属性不会触发更新**：`shallowRef({...}).value.foo = 1` 是 shallowRef 最常见的踩坑点，务必替换整个 `.value` 或调用 `triggerRef`。
- **数组的原地方法失效**：`push` / `splice` / `sort` 都不会触发更新，需要改成返回新数组的写法。
- **仅用于性能优化**：不要为了「看起来更轻」而滥用；普通状态继续用 `ref` / `reactive`，可读性和心智负担更低。
- **计算属性依然可用**：基于 `shallowRef` 建立的 `computed` 会在整体替换时重算，符合直觉。
- **Nuxt 的 `deep` 选项默认值**：目前默认仍是 `true`，主动改为 `false` 才能享受浅层响应；若项目里有代码依赖对 `data` 内部字段的直接修改，需要在启用前审查一遍。
- **Signals 模板写法**：getter 是函数，模板中必须写成 `count()` 而非 `count`，容易忘。
- **`triggerRef` 别乱撒**：只在「值相等但仍需通知」或「无法产生新引用」的场景使用，正常替换 `.value` 已足够触发依赖；散落各处的手动触发会让响应链路难以追踪。
- **配套 API**：`shallowReactive` 与 `shallowReadonly` 语义一致，只对第一层做响应式处理，深层保持原样，遇到大型嵌套结构（如三方库实例、图/树数据）时同样值得考虑。