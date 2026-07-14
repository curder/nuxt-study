# 别再滥用 useFetch {#stop-misusing-usefetch-in-nuxt}

`useFetch` 是 Nuxt 中极为强大的数据获取组合式函数（composable），能自动管理状态、响应式重新请求、甚至缓存数据。

但正因为它「什么都能干」，很多人会在**不该用它的地方**用它——最典型的就是把它塞进表单提交的事件处理函数里。

一个极简的登录 demo 复现了这个坑：一个 `app.vue` 加一个假的登录 API 端点。

:::code-group

```vue [app/app.vue]
<script setup lang="ts">
const username = ref('')
const password = ref('')
const callCount = ref(0)
const success = ref<boolean | null>(null)

async function onSubmit() {
  // ❌ 在事件处理函数里调用组合式函数
  // ❌ 传入 computed body，值一变就自动重发
  const { data } = await useFetch('/api/login', {
    method: 'post',
    body: computed(() => ({
      username: username.value,
      password: password.value
    })),
    onResponse() {
      callCount.value++
    }
  })
  success.value = data.value?.success ?? false
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <input v-model="username" data-1p-ignore placeholder="username" />
    <input v-model="password" data-1p-ignore type="password" placeholder="password" />
    <button type="submit">Login</button>
    <p>success: {{ success }}</p>
    <p>calls: {{ callCount }}</p>
  </form>
</template>
```

```ts [server/api/login.post.ts]
export default defineEventHandler(async (event) => {
    const { username, password } = await readBody(event)

    // 演示用的固定凭据
    if (username === 'admin' && password === 'hunter2') {
        return { success: true }
    }

    throw createError({
        statusCode: 401,
        statusMessage: 'wrong username or password'
    })
})
```

:::

用户名和密码组合成请求体（body）发给登录 API，并用 `onResponse` 统计调用次数。表面看似正常，实则暗藏严重 bug。

## 每敲一个字符都在发请求 {#every-keypress-triggers-a-request}

第一次输错密码时，调用计数（call count）是 1，网络面板里也只有一个 POST 请求，看起来没问题。

但当继续在输入框里打字时，计数开始疯狂飙升——`9`、`10`、`11`……**每输入一个字符都会触发一次对登录 API 的请求**，网络面板瞬间堆满请求。

这不是 Nuxt 坏了，而是**把 `useFetch` 当成普通数据获取函数、而非组合式函数来用**导致的。

## 两个层面的错误 {#two-levels-of-mistakes}

出问题的代码大致是在 `onSubmit` 函数里直接调用 `useFetch`：

```ts
// ❌ 错误示范：在事件处理函数里调用 useFetch
async function onSubmit() {
  const { data } = await useFetch('/api/login', {
    method: 'post',
    body: computed(() => ({ username: username.value, password: password.value })),
    onResponse() {
      callCount.value++
    }
  })
  // ...后续逻辑
}
```

**第一层：违反了组合式函数的调用规则。** 组合式函数只能在生命周期钩子、其他 composable 内部，或 `<script setup>` / `setup()` 函数的**顶层（top level）**调用。而这里把它放进了 `onSubmit` 事件处理函数里——不是顶层，本身就是误用。

**第二层：根本不需要组合式的能力。** 这里只是想「发一次请求」，并不需要 `error` 是响应式的、`data` 是 `ref`。而 `useFetch` 的「聪明」恰恰帮了倒忙：它会**监听（watch）**传给它的所有响应式值（`body`、`params`、`query` 等）。这里传入的是一个 `computed` 组合的 body，于是每当用户名或密码变化，`useFetch` 就自动重新发请求——这才是「每敲一个字就发一次」的真凶。

在事件处理函数里调用 `useFetch`，每次都会**创建一个新的 composable 实例**去监听响应式数据，而这些实例**极难被清理（clean up）**。这也是为什么不该在函数里调用组合式函数——清理不掉，有些还依赖上下文（context）根本无法正常工作。

## 改用 `$fetch` (推荐) {#use-fetch-instead}

最简单的调整方式是提交类请求直接用 `$fetch`。

```ts
// ✅ 正确：用 $fetch 发一次性请求
async function onSubmit() {
  try {
    const data = await $fetch('/api/login', {
      method: 'post',
      body: { username: username.value, password: password.value },
      onResponse() {
        callCount.value++
      }
    })
    // 登录成功后的逻辑
  } catch (error) {
    // 处理错误，比如日志或提示
  }
}
```

关键点：

- `$fetch` **不做任何背后的魔法**——不会 watch、不能 refresh，就是发一次调用。它是 Nuxt 里来自 unjs 的 `ofetch` 包，是对原生 fetch API 的便捷封装。
- 你依然可以用 `onResponse`、设置 `method` 等选项，用法基本一致。
- 实际上 `useFetch` 本身就是**包裹在 `$fetch` 之上的组合式函数**。

改用 `$fetch` 后，现在只有真正点击按钮或按回车时才发一次请求，输错密码只产生一次调用，打字不再触发任何请求。

## 使用 immediate + watch + execute 模式 {#use-immediate-watch-execute-mode}

如果确实想保留 `useFetch` 的能力（如 `pending` 状态），存在一个合法模式:把它移回 `<script setup>` 顶层，并关闭自动执行与监听。

```ts
// ✅ 备选：顶层调用 + 手动触发
const { data, error, execute } = await useFetch('/api/login', {
  method: 'post',
  body: computed(() => ({ username: username.value, password: password.value })),
  immediate: false, // 不立即执行
  watch: false      // 不监听响应式值，避免自动重发
})

async function onSubmit() {
  await execute()   // 手动触发
  if (!error.value) {
    // 继续
  }
}
```

原理说明：

- `immediate: false` 让 `useFetch` 不在初始化时立即执行。
- `watch: false` 关闭对 `body` 等响应式值的监听，杜绝自动重发。
- 暴露出的 `execute`（等同于 `refresh`，两者完全一样，仅命名语义不同）**是组合式函数的返回值，本身只是一个普通函数，不是 composable**，所以在 `onSubmit` 里调用它完全没问题，也是被鼓励的常见用法。

## 常见案例：如何选型（经验法则）{#common-cases}

1. **按钮点击、表单提交，任何非 GET 请求** → 用 `$fetch`（或对 `$fetch` 的封装）。
2. **需要携带 authorization header、bearer token 等** → 同样用 `$fetch` 封装处理。
3. **SSR 所必需的数据** → 放心用 `useFetch`，刷新也没问题。
4. **绝对不要**在事件处理函数（event handler）、`onSubmit` 等非顶层位置调用 `useFetch`。
5. `useFetch` 只在 `<script setup>` 顶层调用。
6. 想在提交场景保留 `useFetch` 能力 → 用 `immediate: false` + `watch: false` + `execute()` 模式。

## 注意事项 {#caution}

| 事项                        | 说明                                      |
|---------------------------|-----------------------------------------|
| useFetch 会 watch 响应式入参    | 传入 `computed` body 时，值一变就自动重发，导致「打字即请求」 |
| 事件处理里调用会创建难清理的实例          | 每次调用都新建 composable 实例，无法清理，且部分依赖上下文会失效  |
| `$fetch` 无魔法              | 来自 `ofetch`，不监听不缓存不刷新，只发一次，适合提交类请求      |
| `execute` 等价于 `refresh`   | 二者完全相同，只是语义命名不同；作为返回值函数可安全在任意位置调用       |
| useFetch 是 \$fetch 的组合式封装 | 理解这层关系有助于选型                             |

在 SSR 场景直接用 `$fetch` 拉取页面初始数据会导致「服务端 + 客户端各请求一次」的双重请求问题，这正是 `useFetch` / `useAsyncData` 存在的意义——它们会把服务端获取的数据通过 payload 传给客户端，避免重复请求。

所以「提交用 `$fetch`、初始加载用 `useFetch`」这条边界背后是有数据传输机制支撑的。

## 相关链接 {#related-links}

- [ofetch 仓库（Nuxt 中的 \$fetch）](https://github.com/unjs/ofetch)
