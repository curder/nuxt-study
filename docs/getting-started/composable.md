---
title: Composable
description: Nuxt 中 Composable 的用法、全局状态管理与最佳实践
---

# Composable {#composable}

在 Nuxt 中，Composable 是一种用于封装和复用逻辑的函数。它通常以 `use` 开头命名，例如 `useUser`、`useAuth`、`useTheme`，可以在页面、组件、插件以及其他 Composable 中复用。

Composable 适合封装状态、计算逻辑、请求逻辑、浏览器能力、业务操作等内容。与普通工具函数不同，Composable 通常会结合 Vue 的响应式能力，例如 `ref()`、`computed()`、`watch()`，也可以使用 Nuxt 提供的 `useState()`、`useCookie()`、`useAsyncData()` 等内置能力。

在 Nuxt 中，`composables/` 目录下的 Composable 默认支持自动导入。因此，在页面或组件中使用 `useUser()` 时，通常不需要手动编写 `import { useUser } from '~/composables/useUser'`。

## 一、基础用法 {#basics}

### 创建一个 Composable {#creating-composable}

Composable 通常定义 in 项目根目录的 `composables/` 目录中。假设要创建一个 `useUser` Composable，用于管理用户状态和登录、退出操作，可以创建如下文件：

```bash
composables/useUser.ts
```

### 在组件中使用 Composable {#using-composable-in-component}

::: tip 提示
在 Nuxt 页面或组件中，可以直接使用 `useUser()`。由于 `composables/` 目录支持自动导入，通常不需要手动 `import`。
:::

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <div v-if="isLoggedIn">
      <p>Welcome, {{ user?.name }}</p>
      <button type="button" @click="logout">
        Logout
      </button>
    </div>

    <div v-else>
      <p>Please log in.</p>
      <button
        type="button"
        @click="login({ id: 1, name: 'John Doe', email: 'john@example.com' })"
      >
        Login
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, isLoggedIn, login, logout } = useUser()
</script>
```

在这个示例中：

- 页面中直接调用 `useUser()`，无需手动导入。
- `isLoggedIn` 用于控制登录和未登录状态下的不同展示。
- `user?.name` 使用可选链，避免用户为空时访问属性导致错误。
- `login()` 和 `logout()` 负责修改用户状态，组件本身不直接关心状态实现细节。

### 自动导入说明 {#auto-import}

Nuxt 会自动扫描 `composables/` 目录，并自动导入其中导出的 Composable。因此在页面和组件中可以直接使用：

```ts
const { user, isLoggedIn } = useUser()
```

通常不需要写成：

```ts
import { useUser } from '~/composables/useUser'

const { user, isLoggedIn } = useUser()
```

不过，在某些特殊场景中，手动导入仍然可能有用，例如：

- 在非 Nuxt 上下文中复用某些纯函数。
- 在测试文件中显式导入目标函数。
- 为了让依赖关系更加明确。
- 当团队代码规范要求显式导入时。

对于大多数 Nuxt 页面、组件和 Composable 来说，依赖自动导入即可。


## 二、状态管理 {#state-management}

### 使用 useState 管理全局共享状态 {#recommended-use-state}

在 Nuxt 中，如果某个状态需要在多个组件之间共享，推荐使用 Nuxt 内置的 `useState()`。`useState()` 是 SSR 安全的响应式状态工具，适合保存用户信息、主题状态、全局配置、购物车状态等需要跨组件共享的数据。

与直接在模块顶层定义 `ref()` 相比，`useState()` 能避免服务端渲染时出现跨请求状态污染的问题。尤其在 SSR 场景中，模块顶层变量可能会在多个用户请求之间复用，从而带来数据泄漏风险。

```ts
// composables/useUser.ts
type User = {
  id: number
  name: string
  email?: string
}

export function useUser() {
  const user = useState<User | null>('user', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))

  function login(userData: User) {
    user.value = userData
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
  }
}
```

在这个示例中：

- `useUser` 是一个 Composable 函数，用于封装用户状态和用户操作。
- `user` 使用 `useState()` 创建，是 Nuxt SSR 安全的全局响应式状态。
- `isLoggedIn` 使用 `computed()` 派生登录状态，避免手动维护多个可能不一致的状态。
- `login()` 用于写入用户信息。
- `logout()` 用于清空用户信息。
- `useState('user', () => null)` 中的 `'user'` 是状态 key，应保持唯一且语义清晰。

### 不推荐的全局状态写法 {#not-recommended-global-ref}

在 Nuxt SSR 项目中，不推荐在 Composable 模块顶层直接定义可变的全局 `ref()` 状态。

```ts
// composables/useUser.ts
// 不推荐：模块顶层的可变状态可能在 SSR 场景中造成跨请求污染
const user = ref(null)

export function useUser() {
  function login(userData) {
    user.value = userData
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    login,
    logout,
  }
}
```

这种写法在纯客户端应用中可能看起来可以正常工作，但在服务端渲染场景中，模块顶层变量有可能被多个请求共享。对于用户信息、权限、会话等敏感状态，应优先使用 `useState()`、`useCookie()` 或服务端接口来管理。

需要注意的是，并不是所有 `ref()` 都不能在 Composable 中使用。如果 `ref()` 定义在 Composable 函数内部，并且只是用于当前调用实例的局部状态，通常是可以的。

```ts
export function useCounter() {
  const count = ref(0)

  function increment() {
    count.value++
  }

  return {
    count,
    increment,
  }
}
```

上面的 `count` 是每次调用 `useCounter()` 时创建的局部状态，不是模块顶层共享状态，因此不会产生同样的跨请求共享问题。

### useState 的 key 命名建议 {#use-state-key}

使用 `useState()` 时，第一个参数是状态 key。这个 key 应该稳定、唯一，并且具有明确语义。

```ts
const user = useState<User | null>('user', () => null)
const theme = useState<'light' | 'dark'>('theme', () => 'light')
const cartItems = useState<CartItem[]>('cart-items', () => [])
```

如果多个 `useState()` 使用了相同的 key，它们会引用同一份状态。因此，不同业务模块应避免使用过于宽泛或容易冲突的 key。

对于大型项目，可以使用带命名空间的 key：

```ts
const user = useState<User | null>('auth:user', () => null)
const permissions = useState<string[]>('auth:permissions', () => [])
const cartItems = useState<CartItem[]>('shop:cart-items', () => [])
```

这样可以降低状态 key 冲突的概率，也能提升可读性。


## 三、编写规范 {#writing-guidelines}

### 派生状态优先使用 computed {#use-computed-for-derived-state}

如果某个状态可以从已有状态推导出来，建议使用 `computed()`，而不是再额外定义一个可变状态。

**推荐写法：**

```ts
export function useUser() {
  const user = useState<User | null>('user', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))

  return {
    user,
    isLoggedIn,
  }
}
```

**不推荐写法：**

```ts
export function useUser() {
  const user = useState<User | null>('user', () => null)
  const isLoggedIn = useState('is-logged-in', () => false)

  function login(userData: User) {
    user.value = userData
    isLoggedIn.value = true
  }

  function logout() {
    user.value = null
    isLoggedIn.value = false
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
  }
}
```

第二种写法需要同时维护 `user` 和 `isLoggedIn` 两个状态。如果后续某个操作只修改了其中一个状态，就可能造成数据不一致。使用 `computed()` 可以让登录状态始终由 `user` 自动推导。

### 返回响应式数据时保持 ref 结构 {#keep-ref-structure}

Composable 通常应该直接返回 `ref`、`computed` 或响应式对象，而不是返回它们的 `.value`。

**推荐写法：**

```ts
export function useUser() {
  const user = useState<User | null>('user', () => null)

  return {
    user,
  }
}
```

**不推荐写法：**

```ts
export function useUser() {
  const user = useState<User | null>('user', () => null)

  return {
    user: user.value,
  }
}
```

返回 `.value` 会丢失响应式连接，调用方无法自动感知状态变化。直接返回 `user` 可以让组件模板和其他逻辑保持响应式更新。

### 只暴露必要的状态和方法 {#expose-only-necessary-api}

Composable 的返回值就是它对外暴露的 API。建议只返回调用方真正需要使用的状态和方法，避免把内部实现细节全部暴露出去。

例如，如果不希望组件直接修改用户状态，可以封装写入操作，只暴露只读状态和方法。

```ts
export function useUser() {
  const user = useState<User | null>('user', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))

  function login(userData: User) {
    user.value = userData
  }

  function logout() {
    user.value = null
  }

  return {
    user: readonly(user),
    isLoggedIn,
    login,
    logout,
  }
}
```

这样组件可以读取 `user`，但不能直接写入 `user.value`。所有状态修改都必须通过 `login()` 或 `logout()` 完成，有助于保持业务逻辑集中。

### 避免在模块顶层执行带副作用的逻辑 {#avoid-side-effects-at-module-top}

Composable 文件的模块顶层适合放类型声明、常量、纯函数等内容，不适合直接执行依赖运行时上下文或用户请求的副作用逻辑。

**不推荐：**

```ts
// 不推荐：模块加载时立即执行
const token = localStorage.getItem('token')

export function useAuth() {
  return {
    token,
  }
}
```

**推荐：**

```ts
export function useAuth() {
  const token = useCookie<string | null>('token')

  return {
    token,
  }
}
```

在 Nuxt 中，如果需要读取 cookie，优先使用 `useCookie()`。它可以同时兼容服务端和客户端场景，而不是直接依赖浏览器中的 `localStorage`。

### 区分客户端和服务端环境 {#client-and-server}

有些 API 只能在浏览器中使用，例如 `window`、`document`、`localStorage`、`navigator`。在 Nuxt 中，如果 Composable 中需要访问这些浏览器 API，应先判断当前环境。

```ts
export function useViewport() {
  const width = ref(0)

  function updateWidth() {
    if (import.meta.client) {
      width.value = window.innerWidth
    }
  }

  onMounted(() => {
    updateWidth()
    window.addEventListener('resize', updateWidth)
  })

  onBeforeUnmount(() => {
    if (import.meta.client) {
      window.removeEventListener('resize', updateWidth)
    }
  })

  return {
    width,
  }
}
```

在这个示例中：

- `window` 只在客户端访问。
- 事件监听在组件挂载后注册。
- 组件卸载前移除事件监听，避免内存泄漏。

### 命名规范 {#naming}

Composable 建议遵循以下命名规则：

- 文件名与函数名保持一致，例如 `composables/useUser.ts` 导出 `useUser()`。
- 函数名以 `use` 开头，表明这是一个 Composable。
- 名称应体现业务语义，例如 `useUser`、`useCart`、`useTheme`。
- 避免使用过于宽泛的名称，例如 `useData`、`useCommon`、`useUtils`。
- 一个 Composable 尽量只负责一个明确的领域。

**推荐：**

```ts
export function useUser() {}
export function useCart() {}
export function useTheme() {}
```

**不推荐：**

```ts
export function useCommon() {}
export function useHelper() {}
export function useEverything() {}
```

清晰的命名可以让项目在规模变大后仍然容易维护。

### TypeScript 类型建议 {#typescript}

在 Nuxt 项目中，推荐为 Composable 的状态、参数 and 返回值添加类型。

```ts
type User = {
  id: number
  name: string
  email?: string
}

type LoginPayload = {
  id: number
  name: string
  email?: string
}

export function useUser() {
  const user = useState<User | null>('user', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))

  function login(payload: LoginPayload) {
    user.value = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    }
  }

  function logout() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
  }
}
```

添加类型可以提升可维护性，并减少组件调用 Composable 时的参数错误。


## 四、进阶模式 {#advanced-patterns}

### 请求数据时优先使用 Nuxt 的数据获取能力 {#data-fetching}

如果 Composable 需要请求服务端数据，可以根据场景使用 `useFetch()`、`useAsyncData()` 或封装后的 API 请求函数。

```ts
export function useProfile() {
  const {
    data: profile,
    pending,
    error,
    refresh,
  } = useFetch('/api/profile')

  return {
    profile,
    pending,
    error,
    refresh,
  }
}
```

如果请求逻辑需要参数，可以将参数传入 Composable：

```ts
export function useUserDetail(userId: MaybeRef<number>) {
  const id = toRef(userId)

  const {
    data: user,
    pending,
    error,
    refresh,
  } = useFetch(() => `/api/users/${id.value}`)

  return {
    user,
    pending,
    error,
    refresh,
  }
}
```

这样可以把请求状态、错误状态、刷新方法一起封装起来，组件只需要关心展示逻辑。

### 组合多个 Composable {#compose-composables}

Composable 可以调用其他 Composable，从而把复杂逻辑拆分成多个小模块。

```ts
export function useAuthUser() {
  const { user, isLoggedIn, logout } = useUser()
  const token = useCookie<string | null>('token')

  function clearSession() {
    token.value = null
    logout()
  }

  return {
    user,
    isLoggedIn,
    token,
    clearSession,
  }
}
```

这种方式可以让每个 Composable 保持职责单一：

- `useUser()` 负责用户状态。
- `useAuthUser()` 负责用户状态与认证信息的组合。
- 页面组件只负责调用和展示。


## 五、最佳实践 {#best-practices}

编写 Nuxt Composable 时，可以遵循以下实践：

1. 共享状态优先使用 `useState()`，尤其是 SSR 项目中的用户状态、主题状态、购物车状态等。
2. 不要在模块顶层定义可变的全局 `ref()` 来保存用户相关状态，避免 SSR 跨请求污染。
3. 可以在 Composable 函数内部使用 `ref()` 管理局部状态。
4. 可以从已有状态推导出的值，优先使用 `computed()`。
5. 返回响应式状态本身，而不是返回 `.value`。
6. 保持 Composable 职责单一，不要把无关逻辑堆在同一个函数中。
7. 对外只暴露必要的状态和方法，避免泄漏内部实现。
8. 涉及浏览器 API 时，注意区分客户端和服务端环境。
9. 添加事件监听、定时器或副作用时，应在合适的生命周期中清理。
10. 请求数据时优先考虑 Nuxt 的 `useFetch()`、`useAsyncData()` 等能力。
11. 为状态、参数和返回值添加 TypeScript 类型。
12. 保持文件名、函数名和业务语义一致。
13. 使用清晰且唯一的 `useState()` key，必要时增加业务命名空间。
14. 避免在 Composable 中混入过多 UI 展示逻辑，让组件负责展示，让 Composable 负责状态和行为。


## 六、完整示例 {#complete-example}

下面是一个更完整的 `useUser` 示例，包含用户状态、登录状态、登录、退出和重置逻辑。

```ts
// composables/useUser.ts
type User = {
  id: number
  name: string
  email?: string
}

type LoginPayload = {
  id: number
  name: string
  email?: string
}

export function useUser() {
  const user = useState<User | null>('auth:user', () => null)

  const isLoggedIn = computed(() => Boolean(user.value))

  function login(payload: LoginPayload) {
    user.value = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
    }
  }

  function logout() {
    user.value = null
  }

  function resetUser() {
    user.value = null
  }

  return {
    user,
    isLoggedIn,
    login,
    logout,
    resetUser,
  }
}
```

页面中使用：

```vue
<!-- pages/index.vue -->
<template>
  <main>
    <section v-if="isLoggedIn">
      <h1>Welcome, {{ user?.name }}</h1>
      <p v-if="user?.email">
        Email: {{ user.email }}
      </p>

      <button type="button" @click="logout">
        Logout
      </button>
    </section>

    <section v-else>
      <h1>Please log in</h1>

      <button
        type="button"
        @click="login({ id: 1, name: 'John Doe', email: 'john@example.com' })"
      >
        Login
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
const { user, isLoggedIn, login, logout } = useUser()
</script>
```

通过这种方式，用户相关逻辑被集中封装在 `useUser()` 中，页面组件只需要负责展示和触发操作。这样可以让业务逻辑更容易复用，也更容易维护和测试。
