# Nuxt useState 和全局状态管理 {#nuxt-usestate-hydration-and-global-state} 

Nuxt 的 `useState` 如何把服务端状态安全传给客户端、消除 hydration 不匹配，同时提供按请求隔离的跨组件全局状态，无需额外引入状态管理库。

在启用服务端渲染（Server-Side Rendering，SSR）的 Nuxt 应用里，状态管理会踩到两个坑。

**第一个坑：服务端与客户端状态对不上。** 页面先在服务端渲染成 HTML，客户端再执行同一份组件并进行 hydration（水合）。如果两侧的初始值不同，就会触发 hydration mismatch，页面还可能出现内容闪烁。

**第二个坑：服务端全局状态的请求隔离。** 服务器是长驻进程，模块顶层的变量会被多个用户请求共享。一旦把用户信息、购物车、权限之类的数据放进这种变量，就会发生跨用户的数据污染。

Nuxt 的 `useState` 一次解决这两件事：把服务端生成的状态写入 payload 传给客户端、通过唯一 key 在组件间共享响应式状态、并在 SSR 中按请求隔离状态——而且对于简单场景，不需要额外引入 Pinia 等依赖。

## Demo：随机值为什么会引发 Hydration 错误 {#demo-random-value-hydration-error}

最典型的触发方式，就是在组件初始化时生成随机值：

```vue
<script setup lang="ts">
const randomValue = ref(Math.random())
</script>

<template>
  <p>Random value: {{ randomValue }}</p>
</template>
```

`<script setup>` 在 SSR 下会执行两次：一次在服务端生成 HTML，一次在客户端用于 hydration。

由于 `Math.random()` 每次结果都不同，服务端可能渲染出 `0.317`，客户端却期望 `0.842`，两边对不上，报错随之出现。

问题的本质不是 `ref` 没有响应式，而是**它不会把服务端算出的值传给客户端**——客户端会重新执行初始化表达式，自然可能得到另一个值。

## 用 useState 修复 Hydration 错误 {#use-state-fix-hydration-error}

把普通 `ref` 换成 `useState`：

```vue
<script setup lang="ts">
const randomValue = useState('random-value', () => Math.random())
</script>

<template>
  <p>Random value: {{ randomValue }}</p>
</template>
```

两个参数：

- `'random-value'`：状态的唯一 key；
- `() => Math.random()`：仅当该 key 尚未初始化时才执行的工厂函数（initializer）。

SSR 期间，Nuxt 先在服务端执行工厂函数，把结果序列化进页面 payload；客户端启动时按同一个 key 读取服务端已生成的值，而**不会**再次调用 `Math.random()`。

执行链路如下：

```text
服务端执行工厂函数 → 生成 random-value → 写入 Nuxt payload
        → HTML 与 payload 一起下发 → 客户端按 key 恢复相同状态 → 完成 hydration
```

所以 `useState` 的核心价值不只是「全局 ref」，而是**可跨越 SSR 边界传输的响应式状态**。

## 在 Nuxt DevTools 中检查状态 {#nuxt-devtools-check-state}

`useState` 创建的状态可以在 Nuxt DevTools 里直接查看。

相比散落在各组件里的匿名 `ref`，带明确 key 的状态更容易定位与调试：

```ts
const counter = useState('counter', () => 0)
const theme = useState('theme', () => 'light')
const user = useState('current-user', () => null)
```

在大型项目里，稳定且可读的 key 能帮你确认状态是否已初始化、服务端状态是否成功传到客户端、是否存在重复 key 导致的意外共享。

避免使用含义模糊的 key：

```ts
// 不推荐
const state = useState('data', () => null)

// 推荐
const currentUser = useState('auth:current-user', () => null)
```

## useState 与序列化限制 {#use-state-serialization-limitations}

要把服务端状态传到客户端，Nuxt 必须对 `useState` 的值进行序列化（serialization）。因此状态值必须是可序列化的。

适合放入的内容：

```ts
useState('count', () => 0)
useState('title', () => 'Nuxt')
useState('enabled', () => true)
useState('items', () => [{ id: 1, name: 'First item' }])
useState('profile', () => ({ id: 1, name: 'Alex' }))
```

不该放入的内容（函数、DOM 节点等无法序列化）：

```ts
// 不推荐：函数无法作为 SSR 状态传输
const handler = useState('handler', () => () => console.log('clicked'))

// 不推荐：DOM 对象无法从服务端序列化
const element = useState<HTMLElement | null>('element', () => document.body)
```

另外，工厂函数可能在服务端执行，不要默认 `window`、`document`、`localStorage` 存在：

```ts
// 错误：SSR 时没有 window
const width = useState('window-width', () => window.innerWidth)

// 正确：挂载后再读取浏览器 API
const width = useState<number | null>('window-width', () => null)
onMounted(() => {
  width.value = window.innerWidth
})
```

## 如何错误地创建全局状态 {#global-state-mistakes}

### 错误一：模块顶层的 ref {#global-state-mistakes-module-top-level-ref}

```ts
// composables/useCounter.ts
// 错误：模块级单例，服务端会跨请求共享
const count = ref(0)

export function useCounter() {
  return count
}
```

纯客户端应用里它看似正常，但在 SSR 服务器上，模块被进程加载并长期存在，多个用户请求会访问同一个 `count`：

```text
用户 A 请求 → count 改为 10
用户 B 请求 → 读到同一个 count
```

计数器只是数据错乱，但如果存的是用户或权限信息，后果就严重了。

### 错误二：composable 内每次都新建 ref {#global-state-mistakes-composable-new-ref}

```ts
// composables/useCounter.ts
export function useCounter() {
  const count = ref(0)   // 每次调用都是新实例
  return { count }
}
```

它避免了模块级单例，但**根本不是全局状态**——每次调用都得到独立的 `ref`：

```ts
const first = useCounter()
const second = useCounter()
first.count.value++
console.log(second.count.value) // 仍然是 0
```

## 用 useState 正确实现全局状态 {#global-state-correct-implementation}

把 `useState` 放进 composable 函数内部：

```ts
// composables/useCounter.ts
export function useCounter() {
  const count = useState<number>('counter', () => 0)

  const increment = () => { count.value++ }
  const decrement = () => { count.value-- }
  const reset = () => { count.value = 0 }

  return { count, increment, decrement, reset }
}
```

只要 key 都是 `'counter'`，任何组件调用 `useCounter()` 拿到的都是同一份状态：

```vue
<script setup lang="ts">
const { count, increment, decrement, reset } = useCounter()
</script>

<template>
  <button @click="decrement">-</button>
  <strong>{{ count }}</strong>
  <button @click="increment">+</button>
  <button @click="reset">Reset</button>
</template>
```

这样同时满足三点：组件间共享同一状态、服务端与客户端能传输初始值、服务端请求之间互相隔离。

## key 才是共享状态的身份 {#key-is-identity-of-shared-state}

`useState` 是否共享取决于 key，而非变量名：

```ts
const first = useState('counter', () => 0)
const second = useState('counter', () => 100)
// first 与 second 指向同一状态；第二个工厂函数可能根本不执行
```

因此不同文件用了相同 key 会意外共享：

```ts
// useCart.ts
const state = useState('state', () => [])
// useNotifications.ts
const state = useState('state', () => [])  // 与购物车共享同一状态！
```

用命名空间避免冲突：

```ts
const cart = useState('cart:items', () => [])
const notifications = useState('notifications:items', () => [])
```

工厂函数应只返回初始值，而不承担复杂副作用。如需异步获取 SSR 数据，用 `useFetch` 或 `useAsyncData`，再把必要结果写入状态——不要把 `useState` 当异步取数工具。

## useState 并不总是要被 Pinia 取代 {#use-state-not-always-replaced-by-pinia}

对于简单全局状态，`useState` 就够了：当前主题、导航栏开关、简单计数器、当前用户的基础展示信息、SSR 期间需传给客户端的初始值等。

```ts
// composables/useTheme.ts
type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('ui:theme', () => 'light')
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  return { theme, toggleTheme }
}
```

但它不是完整状态管理框架的替代品。当状态模块多且依赖复杂、需要插件体系、需要严格组织 actions/getters、需要专门持久化或测试策略时，Pinia 仍是更合适的选择。

重点是：**简单状态没必要为了全局共享就立刻引入额外依赖。**

## 常见案例：useState 实操清单 {#common-usecases}

1. 找出会在服务端和客户端产生不同结果的初始值（随机数、时间、动态生成内容）。
2. 把普通 `ref` 换成带稳定 key 的 `useState`。
3. 确保状态可序列化，不放函数、DOM 节点等运行时对象。
4. 把跨组件状态封装进 composable，并在函数体内调用 `useState`。
5. 用业务命名空间设计 key，如 `auth:user`、`cart:items`。
6. 在 Nuxt DevTools 中核对状态的初始化、传输与共享是否正确。
7. 复杂状态继续用专门的状态库，不必强塞进 `useState`。

## 注意事项 {#considerations}

| 事项                      | 说明                                      |
|-------------------------|-----------------------------------------|
| 别用模块顶层 `ref` 存 SSR 用户状态 | 会变成服务器进程级单例，导致跨请求数据污染                   |
| `useState` 靠 key 共享     | 相同 key 指向同一状态，重复 key 会造成意外覆盖            |
| 初始值必须可序列化               | 状态要通过 Nuxt payload 从服务端传到客户端            |
| 工厂函数别依赖浏览器 API          | 它可能在没有 `window`/`document` 的服务端执行       |
| `useState` 不负责异步取数      | SSR 异步数据优先用 `useFetch` / `useAsyncData` |
| 不要存敏感信息                 | payload 客户端可见，密钥、令牌不应写入                 |
| 普通 `ref` 仍有价值           | 仅组件内、无需跨 SSR 传输的状态继续用 `ref`             |

`useState` 最该记住的两点能力是：**安全地把状态从服务端交给客户端，以及在 SSR 环境中创建按请求隔离的共享状态。**