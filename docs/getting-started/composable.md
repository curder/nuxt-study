# Composable

在 Nuxt 中，[Composable](https://nuxt.com/docs/api/composables/use-app-config) 是一种功能强大的工具，允许创建可复用的逻辑片段，这些逻辑片段可以在多个组件之间共享。

## 创建一个 Composable

Composable 通常定义在 `composables` 目录中。假设想创建一个 `useUser` 的 Composable，它负责管理用户的状态和操作。

### 创建 Composable 函数

在 `composables` 目录下创建一个新的文件，例如 `useUser.js` 或 `useUser.ts`：

```js
// composables/useUser.js
import { ref } from 'vue'

export function useUser() {
  const user = ref(null)
  const isLoggedIn = ref(false)

  function login(userData) {
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

在这个示例中：
- `useUser` 是一个 Composable 函数，封装了用户的状态和操作。
- `user` 和 `isLoggedIn` 是两个 `ref`，分别存储用户数据和登录状态。
- `login` 和 `logout` 是操作用户状态的函数。

### 在组件中使用 Composable

可以在任何组件中导入并使用 `useUser` Composable。

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <div v-if="isLoggedIn">
      <p>Welcome, {{ user.name }}</p>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <p>Please log in.</p>
      <button @click="login({ name: 'John Doe' })">Login</button>
    </div>
  </div>
</template>

<script setup>
import { useUser } from '~/composables/useUser'

const { user, isLoggedIn, login, logout } = useUser()
</script>
```

在这个示例中：
- 导入并使用 `useUser` Composable。
- 根据 `isLoggedIn` 的值显示不同的内容和按钮。
