# 获取数据 {#fetching-data}

在 Nuxt 中，`useFetch`、`useAsyncData` 和 `$fetch` 是用于数据获取的核心工具。它们不仅支持服务器端渲染（SSR）中的数据预取，还能自动处理客户端导航时的状态同步、请求缓存、错误处理和状态复用。

合理选择数据获取方式非常重要。页面初始化数据通常应该优先使用 `useFetch` 或 `useAsyncData`，而用户点击、表单提交、点赞、删除、上传等交互式请求，则更适合使用 `$fetch`。

## 核心工具对比 {#core-tools}

### 1. `$fetch` (底层请求工具) {#dollar-fetch}

`$fetch` 是 Nuxt 内置的底层请求工具，基于 `ofetch` 封装。它可以在客户端、服务端、插件、组合式函数、Server Route 等多个位置使用。

它本质上是一个 Promise 风格的请求函数，不会自动创建响应式状态，也不会自动把服务端请求结果序列化到 Nuxt Payload 中。

*   **优点**：使用灵活，语法简单，适合手动触发的请求。
*   **适用场景**：表单提交、按钮点击、登录、注册、点赞、删除、上传、Server Route 中调用外部 API。
*   **注意事项**：不建议直接在页面 `setup` 顶层使用 `$fetch` 获取首屏展示数据，否则可能导致服务端和客户端各请求一次。

```vue
<script setup>
const submitForm = async () => {
  const result = await $fetch('/api/submit', {
    method: 'POST',
    body: {
      title: 'Hello Nuxt'
    }
  })

  console.log(result)
}
</script>

<template>
  <button @click="submitForm">提交</button>
</template>
```

### 2. `useFetch` (推荐) {#use-fetch}

`useFetch` 是 `useAsyncData` 配合 `$fetch` 的**语法糖**。它是最常用的数据获取方式。

*   **优点**：代码简洁，自动根据 URL 生成唯一的 `key`，自动推断响应类型，支持 SSR 数据预取。
*   **适用场景**：直接请求一个具体的 URL 地址，尤其适合页面首屏数据、列表页、详情页、搜索页等场景。
*   **核心能力**：自动处理服务端和客户端之间的数据同步，避免 SSR 后客户端重复请求。

```vue
<script setup>
// 简洁的语法糖写法
const { data, pending, error, refresh } = await useFetch('/api/todos')
</script>
```

### 3. `useAsyncData` {#use-async-data}

`useAsyncData` 更加底层，它包裹一个异步函数并处理其结果。

*   **优点**：更细粒度的控制。可以在一个钩子内组合多个请求，或执行非 HTTP 的异步逻辑。
*   **适用场景**：需要自定义 Key、逻辑组合、并行请求、依赖第三方 SDK、读取服务端资源或执行复杂异步逻辑。

```vue
<script setup>
const { data } = await useAsyncData('custom-key', async () => {
  const [todos, categories] = await Promise.all([
    $fetch('/api/todos'),
    $fetch('/api/categories')
  ])

  return { todos, categories }
})
</script>
```


## 核心工具快速对比 {#comparison-table}

| 对比项 | `$fetch` | `useFetch` | `useAsyncData` |
| :--- | :--- | :--- | :--- |
| 是否响应式 | 否 | 是 | 是 |
| 是否支持 SSR 数据同步 | 否 | 是 | 是 |
| 是否避免客户端重复请求 | 否 | 是 | 是 |
| 是否自动生成 Key | 不需要 | 是 | 否，通常需手动指定 |
| 是否适合页面首屏数据 | 不推荐 | 推荐 | 推荐 |
| 是否适合按钮点击请求 | 推荐 | 不推荐 | 不推荐 |
| 是否适合多请求聚合 | 一般 | 一般 | 推荐 |
| 是否适合 Server Route 内部请求 | 推荐 | 不适合 | 不适合 |
| 典型用途 | 提交、删除、上传、服务端代理 | 页面列表、详情、搜索 | 多接口聚合、复杂异步逻辑 |


## 如何选择请求方式 {#how-to-choose}

在实际项目中，可以按照以下规则选择：

*   页面打开时就需要展示的数据，优先使用 `useFetch`。
*   多个接口需要并行请求并合并结果，优先使用 `useAsyncData`。
*   用户点击后才触发的操作，优先使用 `$fetch`。
*   Server Route 中请求外部服务，使用 `$fetch`。
*   需要 SSR、SEO 或首屏渲染的数据，不要直接在 `setup` 顶层使用 `$fetch`。
*   需要完全控制请求时机，可以使用 `immediate: false` 搭配 `execute` 或 `refresh`。


## 内置请求方式详解 {#built-in-request-methods}

### 1. GET 请求 {#get-request}

GET 请求是最常见的数据读取方式。对于页面展示数据，推荐使用 `useFetch`。

```vue
<script setup>
const { data, pending, error } = await useFetch('/api/posts')
</script>

<template>
  <div v-if="pending">正在加载...</div>
  <div v-else-if="error">加载失败：{{ error.message }}</div>
  <ul v-else>
    <li v-for="post in data" :key="post.id">
      {{ post.title }}
    </li>
  </ul>
</template>
```

### 2. 带 Query 参数的 GET 请求 {#get-request-with-query}

`useFetch` 支持通过 `query` 传递查询参数。响应式变量发生变化时，可以配合 `watch` 自动刷新。

```vue
<script setup>
const page = ref(1)
const keyword = ref('')

const { data, pending } = await useFetch('/api/products', {
  query: {
    page,
    q: keyword
  },
  watch: [page, keyword]
})
</script>
```

### 3. POST 请求 {#post-request}

POST 请求通常用于创建数据或提交表单。如果是用户主动点击触发，推荐使用 `$fetch`。

```vue
<script setup>
const form = reactive({
  title: '',
  content: ''
})

const pending = ref(false)
const errorMessage = ref('')

const submit = async () => {
  pending.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/posts', {
      method: 'POST',
      body: form
    })
  } catch (error) {
    errorMessage.value = '提交失败，请稍后重试'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <input v-model="form.title" placeholder="标题" />
    <textarea v-model="form.content" placeholder="内容" />
    <button :disabled="pending">
      {{ pending ? '提交中...' : '提交' }}
    </button>
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </form>
</template>
```

### 4. PUT / PATCH 请求 {#put-patch-request}

PUT 或 PATCH 通常用于更新数据。一般也是交互式操作，适合使用 `$fetch`。

```javascript
const updateUser = async () => {
  await $fetch('/api/user/profile', {
    method: 'PATCH',
    body: {
      nickname: 'Nuxt User',
      avatar: '/avatar.png'
    }
  })
}
```

### 5. DELETE 请求 {#delete-request}

DELETE 用于删除资源。删除后通常需要刷新列表，可以结合 `refresh` 使用。

```vue
<script setup>
const { data: posts, refresh } = await useFetch('/api/posts')

const removePost = async (id) => {
  await $fetch(`/api/posts/${id}`, {
    method: 'DELETE'
  })

  await refresh()
}
</script>
```

### 6. 文件上传请求 {#upload-request}

上传文件时可以使用 `FormData`，通常使用 `$fetch` 手动触发。

```vue
<script setup>
const upload = async (event) => {
  const file = event.target.files[0]
  const formData = new FormData()

  formData.append('file', file)

  await $fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
}
</script>

<template>
  <input type="file" @change="upload" />
</template>
```

### 7. Server Route 中请求外部 API {#server-route-fetch}

如果请求需要使用私密 Token、API Key 或服务端环境变量，应该放到 Nuxt Server Route 中完成。

```typescript
// server/api/weather.get.ts
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  return await $fetch('https://api.example.com/weather', {
    headers: {
      Authorization: `Bearer ${config.weatherApiToken}`
    }
  })
})
```

前端页面只请求自己的服务端接口：

```javascript
const { data } = await useFetch('/api/weather')
```


## 进阶配置选项 {#advanced-options}

### 非阻塞加载 (`lazy`) {#lazy-loading}

默认情况下，路由跳转会等待数据获取完成。设置 `lazy: true` 可以实现非阻塞加载，提升用户感知的响应速度。

```vue
<script setup>
const { data, pending } = useFetch('/api/posts', {
  lazy: true
})
</script>

<template>
  <!-- 结合骨架屏或加载动画提升 UX -->
  <div v-if="pending">正在加载内容...</div>
  <div v-else v-for="post in data" :key="post.id">{{ post.title }}</div>
</template>
```

### 仅客户端请求 (`server: false`) {#client-only-fetch}

有些数据只适合在客户端获取，例如依赖浏览器环境、用户本地状态、客户端定位权限的数据。

```vue
<script setup>
const { data, pending } = await useFetch('/api/client-only-data', {
  server: false
})
</script>
```

### 延迟手动执行 (`immediate: false`) {#manual-execution}

当你不希望请求在组件初始化时自动执行，可以设置 `immediate: false`，然后通过 `execute` 手动触发。

```vue
<script setup>
const keyword = ref('')

const { data, pending, execute } = await useFetch('/api/search', {
  query: {
    q: keyword
  },
  immediate: false
})

const search = async () => {
  if (!keyword.value) return
  await execute()
}
</script>

<template>
  <input v-model="keyword" placeholder="请输入关键词" />
  <button @click="search">搜索</button>
</template>
```

### 默认值 (`default`) {#default-value}

当数据还没有返回时，可以使用 `default` 提供初始值，避免模板中出现空值判断过多的问题。

```javascript
const { data: posts } = await useFetch('/api/posts', {
  default: () => []
})
```

### 性能优化：去重与缓存 {#dedupe-and-caching}

*   **`dedupe`**: 默认为 `cancel`。当相同 Key 的请求在进行中时，新的请求会取消旧的，避免竞态条件。
*   **`getCachedData`**: 用于自定义缓存逻辑。如果数据已存在（如在 Pinia 中），则直接返回缓存，跳过网络请求。

```javascript
const { data } = useFetch('/api/user', {
  key: 'user-profile',
  getCachedData: (key) => {
    const nuxtApp = useNuxtApp()
    return nuxtApp.payload.data[key] // 尝试从 Nuxt 状态负载中恢复
  }
})
```

### 请求超时 (`timeout`) {#request-timeout}

对于不稳定的外部接口，建议设置请求超时时间，避免页面长时间等待。

```javascript
const { data, error } = await useFetch('/api/report', {
  timeout: 5000
})
```

### 请求拦截器 (`onRequest`) {#on-request}

可以在请求发出前统一添加 Header、Token、Trace ID 等信息。

```javascript
const { data } = await useFetch('/api/user', {
  onRequest({ options }) {
    options.headers = {
      ...options.headers,
      'X-Client': 'web'
    }
  }
})
```

### 响应拦截器 (`onResponse`) {#on-response}

可以在响应返回后统一处理数据、记录日志或读取响应头。

```javascript
const { data } = await useFetch('/api/user', {
  onResponse({ response }) {
    console.log('请求完成：', response.status)
  }
})
```

### 响应错误拦截器 (`onResponseError`) {#on-response-error}

可以统一处理 401、403、500 等错误状态。

```javascript
const { data } = await useFetch('/api/user', {
  async onResponseError({ response }) {
    if (response.status === 401) {
      return await navigateTo('/login')
    }
  }
})
```


## 最佳实践 {#best-practices}

### 1. POST 请求与安全 {#post-requests-and-security}

**不要在客户端直接暴露 API Key。** 推荐的做法是创建一个 Nuxt Server Route 作为代理，在服务端处理敏感逻辑。

::: code-group
```typescript [创建服务端路由]
// server/api/submit.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = useRuntimeConfig()
  
  // 在服务端安全地使用秘钥调用外部 API
  return await $fetch('https://api.external.com/v1/action', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiToken}` },
    body
  })
})
```

```javascript [前端组件调用]
const { data } = await useFetch('/api/submit', {
  method: 'POST',
  body: { id: 123, status: 'active' }
})
```
:::

### 2. 监听参数自动刷新 (Watch) {#watch-params}

在搜索页面或分页场景中，当 URL 参数或响应式变量变化时，我们需要自动重新获取数据。`useFetch` 内置了对 `watch` 的支持。

```vue {8}
<script setup>
const page = ref(1)
const searchTerm = ref('')

const { data, pending, refresh } = await useFetch('/api/products', {
  // 当 page 或 searchTerm 变化时，请求会自动重新发送
  query: { page, q: searchTerm },
  watch: [page, searchTerm]
})
</script>
```

### 3. 数据转换与精简 (Transform & Pick) {#data-transformation}

为了减少客户端内存占用和网络传输量（尤其是 SSR 场景），你应该只提取页面需要的字段。

```javascript
// 假设 API 返回了完整的 User 对象，但我们只需要姓名和头像
const { data: user } = await useFetch('/api/user/1', {
  // 方式 A：使用 pick 指定字段
  pick: ['name', 'avatar'],
  
  // 方式 B：使用 transform 进行更复杂的处理
  transform: (user) => {
    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`,
      fetchedAt: new Date().toLocaleTimeString()
    }
  }
})
```

### 4. 身份验证与全局请求拦截 (Interceptors) {#auth-and-interceptors}

在需要登录的场景中，你通常需要为所有请求添加 `Authorization` 头，或者统一处理 401 错误。

```javascript
// composables/useApi.ts
export const useApi = (url: string, options: any = {}) => {
  const userAuth = useCookie('auth_token')
  
  return useFetch(url, {
    ...options,
    onRequest({ options }) {
      if (userAuth.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${userAuth.value}`
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // 使用 return 确保逻辑在这里终止并触发跳转
        // 特别是在 SSR 模式下，这能更可靠地处理服务端重定向
        return await navigateTo('/login')
      }
    }
  })
}
```

> 注意：在拦截器中使用 `navigateTo` 时建议使用 `return`，以确保在服务端渲染时能正确中断并触发重定向。

### 5. 瀑布流/无限加载 (Refresh & Append) {#infinite-scroll}

在“加载更多”的场景中，我们需要手动控制请求并手动合并新旧数据。

```vue
<script setup>
const page = ref(1)
const allItems = ref([])

const { data: newData, execute, pending } = await useFetch('/api/items', {
  query: { page },
  immediate: false, // 阻止初始化时自动执行，由逻辑控制
  watch: false      // 禁用自动监听，改用手动控制
})

const loadMore = async () => {
  page.value++
  await execute() // 手动触发请求
  if (newData.value) {
    allItems.value.push(...newData.value)
  }
}
</script>
```

### 6. 并行请求，避免瀑布流等待 {#parallel-requests}

如果多个请求之间没有依赖关系，应该使用 `Promise.all` 并行请求，避免一个接口等待另一个接口完成后才开始。

```javascript
const { data } = await useAsyncData('home-page-data', async () => {
  const [banners, products, articles] = await Promise.all([
    $fetch('/api/banners'),
    $fetch('/api/products'),
    $fetch('/api/articles')
  ])

  return {
    banners,
    products,
    articles
  }
})
```

这种方式比在页面里连续写多个 `await useFetch` 更容易统一管理加载状态，也能减少整体等待时间。

### 7. 依赖请求：后一个请求依赖前一个结果 {#dependent-requests}

有些场景中，第二个请求必须依赖第一个请求的返回结果。例如先获取用户信息，再根据用户 ID 获取订单列表。

```vue
<script setup>
const { data: user } = await useFetch('/api/user/me')

const { data: orders, execute } = await useFetch('/api/orders', {
  query: {
    userId: computed(() => user.value?.id)
  },
  immediate: false
})

watch(
  () => user.value?.id,
  async (userId) => {
    if (userId) {
      await execute()
    }
  },
  { immediate: true }
)
</script>
```

如果依赖逻辑较多，也可以使用 `useAsyncData` 统一串联：

```javascript
const { data } = await useAsyncData('user-with-orders', async () => {
  const user = await $fetch('/api/user/me')

  if (!user?.id) {
    return {
      user,
      orders: []
    }
  }

  const orders = await $fetch('/api/orders', {
    query: {
      userId: user.id
    }
  })

  return {
    user,
    orders
  }
})
```

### 8. 详情页 SEO：请求失败时抛出 404 {#seo-detail-page}

文章详情页、商品详情页等 SEO 关键页面，如果数据不存在，应该在服务端直接抛出 404，而不是让页面空白或客户端再处理。

```vue
<script setup>
const route = useRoute()

const { data: post, error } = await useFetch(`/api/posts/${route.params.slug}`)

if (error.value || !post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '文章不存在',
    fatal: true
  })
}
</script>
```

### 9. 使用 `useRequestFetch` 转发服务端请求上下文 {#use-request-fetch}

在 SSR 场景下，如果服务端请求内部 API 时需要携带用户 Cookie 或 Header，可以使用 `useRequestFetch`。

```javascript
const requestFetch = useRequestFetch()

const { data } = await useAsyncData('profile', () => {
  return requestFetch('/api/profile')
})
```

这在登录态 SSR 页面中非常有用，可以让服务端请求保留当前用户上下文。

### 10. 使用运行时配置管理 Base URL {#runtime-config-base-url}

不要在页面中到处硬编码接口地址。推荐使用 `runtimeConfig` 统一管理。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',
    public: {
      apiBase: '/api'
    }
  }
})
```

```javascript
// composables/useApi.ts
export const useApi = (url, options = {}) => {
  const config = useRuntimeConfig()

  return useFetch(url, {
    baseURL: config.public.apiBase,
    ...options
  })
}
```

页面中使用：

```javascript
const { data } = await useApi('/products')
```

### 11. 统一处理业务错误码 {#business-error-code}

很多后端接口即使 HTTP 状态码是 200，也可能通过业务字段表示失败，例如 `code !== 0`。可以在封装层统一处理。

```typescript
// composables/useApi.ts
export const useApi = (url: string, options: any = {}) => {
  return useFetch(url, {
    ...options,
    transform: (response: any) => {
      if (response.code !== 0) {
        throw createError({
          statusCode: 400,
          statusMessage: response.message || '业务请求失败'
        })
      }

      return response.data
    }
  })
}
```

这样页面中可以直接拿到真正的 `data`，不需要每个页面都重复判断 `code`。

### 12. 提交后刷新当前列表 {#refresh-after-mutation}

新增、编辑、删除之后，常见需求是刷新当前列表。可以保留 `refresh` 方法，在操作完成后调用。

```vue
<script setup>
const { data: todos, refresh } = await useFetch('/api/todos')

const addTodo = async (title) => {
  await $fetch('/api/todos', {
    method: 'POST',
    body: { title }
  })

  await refresh()
}
</script>
```

### 13. 乐观更新：先更新界面，再请求接口 {#optimistic-update}

在点赞、收藏等轻量操作中，可以先更新页面状态，再发起请求。如果失败，再回滚状态。

```vue
<script setup>
const liked = ref(false)
const likeCount = ref(0)

const toggleLike = async () => {
  const previousLiked = liked.value
  const previousCount = likeCount.value

  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1

  try {
    await $fetch('/api/like', {
      method: 'POST',
      body: {
        liked: liked.value
      }
    })
  } catch (error) {
    liked.value = previousLiked
    likeCount.value = previousCount
  }
}
</script>
```

乐观更新能提升交互速度，但只适合失败影响较小、可回滚的操作。

### 14. 防抖搜索，避免频繁请求 {#debounced-search}

搜索框输入时不应该每输入一个字符就立即请求接口。可以通过防抖控制请求频率。

```vue
<script setup>
const keyword = ref('')
let timer = null

const { data, pending, refresh } = await useFetch('/api/search', {
  query: {
    q: keyword
  },
  immediate: false
})

watch(keyword, () => {
  if (timer) {
    clearTimeout(timer)
  }

  timer = setTimeout(() => {
    if (keyword.value.trim()) {
      refresh()
    }
  }, 300)
})
</script>
```

### 15. 分页列表：保留查询条件和页码 {#pagination-list}

分页场景中，页码和筛选条件通常应该放在响应式变量中，并让请求自动跟随变化。

```vue
<script setup>
const page = ref(1)
const category = ref('all')

const { data, pending } = await useFetch('/api/products', {
  query: {
    page,
    category
  },
  watch: [page, category]
})

watch(category, () => {
  page.value = 1
})
</script>
```

### 16. 避免重复 Key 导致数据串用 {#avoid-duplicate-key}

`useAsyncData` 依赖 Key 来缓存和复用数据。如果多个请求使用了相同 Key，但请求逻辑不同，可能导致数据串用。

```javascript
const route = useRoute()

const { data } = await useAsyncData(
  `post-${route.params.id}`,
  () => $fetch(`/api/posts/${route.params.id}`)
)
```

如果是详情页、用户页、订单页等动态页面，Key 中应该包含动态参数。

### 17. 切换路由参数时重新请求详情数据 {#route-param-refresh}

在动态路由页面中，如果从 `/posts/1` 跳到 `/posts/2`，组件可能被复用。此时需要监听路由参数变化。

```vue
<script setup>
const route = useRoute()

const { data: post } = await useFetch(
  () => `/api/posts/${route.params.id}`,
  {
    watch: [() => route.params.id]
  }
)
</script>
```

### 18. 使用 `clear` 清理旧数据 {#clear-data}

当用户切换筛选条件或退出页面时，如果不希望旧数据继续展示，可以使用 `clear` 清理当前数据状态。

```javascript
const { data, refresh, clear } = await useFetch('/api/search', {
  query: {
    q: keyword
  },
  immediate: false
})

const resetSearch = () => {
  keyword.value = ''
  clear()
}
```

### 19. 使用 `callOnce` 避免重复初始化 {#call-once}

某些初始化逻辑只希望在应用生命周期内执行一次，例如加载全局配置、初始化用户设置等，可以使用 `callOnce`。

```javascript
await callOnce('load-app-config', async () => {
  const configStore = useConfigStore()
  await configStore.fetchConfig()
})
```

这类逻辑通常适合和 Pinia Store 搭配使用。

### 20. 在 Pinia 中使用 `$fetch` 管理状态 {#pinia-with-fetch}

在 Pinia Store 中通常不建议直接使用 `useFetch`，因为 `useFetch` 更适合组件或页面上下文。Store 中推荐使用 `$fetch`，并手动维护状态。

```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const pending = ref(false)

  const fetchUser = async () => {
    pending.value = true

    try {
      user.value = await $fetch('/api/user/me')
    } finally {
      pending.value = false
    }
  }

  return {
    user,
    pending,
    fetchUser
  }
})
```

页面中调用：

```vue
<script setup>
const userStore = useUserStore()

await callOnce('user', () => userStore.fetchUser())
</script>
```

### 21. 处理表单校验错误 {#form-validation-errors}

提交表单时，后端可能返回字段级错误。推荐在 `catch` 中读取错误响应并映射到表单状态。

```vue
<script setup>
const form = reactive({
  email: '',
  password: ''
})

const fieldErrors = ref({})

const submit = async () => {
  fieldErrors.value = {}

  try {
    await $fetch('/api/register', {
      method: 'POST',
      body: form
    })
  } catch (error) {
    fieldErrors.value = error?.data?.errors || {}
  }
}
</script>
```

### 22. SSR 中设置缓存响应头 {#cache-control}

对于不频繁变化的页面或接口，可以在服务端设置缓存响应头，减少重复请求压力。

```typescript
// server/api/categories.get.ts
export default defineEventHandler(async (event) => {
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=60, stale-while-revalidate=300'
  )

  return await $fetch('https://api.example.com/categories')
})
```

### 23. 统一封装客户端交互请求 {#mutation-helper}

可以封装一个专门处理用户操作的请求工具，例如统一管理提交状态、错误提示和成功回调。

```typescript
// composables/useMutation.ts
export const useMutation = () => {
  const pending = ref(false)
  const error = ref(null)

  const mutate = async (handler: () => Promise<any>) => {
    pending.value = true
    error.value = null

    try {
      return await handler()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    mutate
  }
}
```

使用方式：

```vue
<script setup>
const { pending, error, mutate } = useMutation()

const submit = () => {
  return mutate(() => {
    return $fetch('/api/posts', {
      method: 'POST',
      body: {
        title: 'Hello'
      }
    })
  })
}
</script>
```

### 24. 避免在模板中直接处理复杂空值 {#avoid-template-null-checks}

如果接口返回数据可能为空，建议在请求层通过 `default` 或 `transform` 统一整理数据结构，减少模板复杂度。

```javascript
const { data: profile } = await useFetch('/api/profile', {
  default: () => ({
    name: '',
    avatar: '',
    roles: []
  })
})
```

模板中就可以更安全地使用：

```vue
<template>
  <img :src="profile.avatar" />
  <p>{{ profile.name }}</p>
</template>
```

### 25. 上传后刷新资源列表 {#refresh-after-upload}

文件上传完成后，通常需要刷新附件列表或资源列表。

```vue
<script setup>
const { data: files, refresh } = await useFetch('/api/files')

const uploadFile = async (event) => {
  const file = event.target.files[0]
  const formData = new FormData()

  formData.append('file', file)

  await $fetch('/api/files', {
    method: 'POST',
    body: formData
  })

  await refresh()
}
</script>
```


## 错误处理 {#error-handling}

除了通过钩子返回的 `error` 变量进行局部处理外，还可以使用 Nuxt 的组件边界来捕获错误。

### 局部错误处理 {#local-error-handling}

```vue
<template>
  <div v-if="error">
    <p>加载失败: {{ error.message }}</p>
    <button @click="refresh">重试</button>
  </div>
</template>
```

### 全局/组件边界错误处理 {#global-error-boundary}

使用 `NuxtErrorBoundary` 包裹可能出错的区域，避免整个页面崩溃。

```vue
<template>
  <NuxtErrorBoundary>
    <!-- 正常组件逻辑 -->
    <AsyncListComponent />

    <!-- 错误状态插槽 -->
    <template #error="{ error, clearError }">
      <div class="error-box">
        <p>抱歉，数据加载出现异常。</p>
        <button @click="clearError">重置状态并重试</button>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>
```

### 页面级错误处理 {#page-level-error}

对于详情页、权限页等关键页面，可以使用 `createError` 抛出页面级错误。

```vue
<script setup>
const route = useRoute()

const { data, error } = await useFetch(`/api/products/${route.params.id}`)

if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: '商品不存在'
  })
}
</script>
```

### 清除错误并重试 {#clear-error-and-retry}

在组件边界中，可以通过 `clearError` 清理错误状态，并允许用户重新尝试。

```vue
<template>
  <NuxtErrorBoundary>
    <ProductList />

    <template #error="{ error, clearError }">
      <p>{{ error.message }}</p>
      <button @click="clearError">重新加载组件</button>
    </template>
  </NuxtErrorBoundary>
</template>
```


## 性能优化建议 {#performance-optimization}

### 1. 首屏数据使用 `useFetch` 或 `useAsyncData` {#use-ssr-friendly-fetch}

首屏展示数据应该使用支持 SSR 状态同步的请求方式，避免客户端重复请求。

```javascript
const { data } = await useFetch('/api/home')
```

不要这样写：

```javascript
const data = await $fetch('/api/home')
```

### 2. 使用 `pick` 或 `transform` 减少 Payload {#reduce-payload}

SSR 场景中，服务端获取的数据会序列化到客户端。如果返回字段过多，会增加 HTML 体积。

```javascript
const { data } = await useFetch('/api/user', {
  pick: ['id', 'name', 'avatar']
})
```

### 3. 多个无依赖请求使用并行 {#use-parallel-fetch}

不要让无依赖请求串行等待。

```javascript
const { data } = await useAsyncData('dashboard', async () => {
  const [stats, messages, tasks] = await Promise.all([
    $fetch('/api/stats'),
    $fetch('/api/messages'),
    $fetch('/api/tasks')
  ])

  return {
    stats,
    messages,
    tasks
  }
})
```

### 4. 合理使用 `lazy` 提升跳转体验 {#use-lazy-for-navigation}

非关键数据可以使用 `lazy: true`，让页面先完成导航，再显示加载状态。

```javascript
const { data, pending } = useFetch('/api/recommendations', {
  lazy: true
})
```

### 5. 高频交互使用防抖或节流 {#debounce-or-throttle}

搜索、筛选、滚动加载等高频请求必须进行控制，避免接口压力过大。

```javascript
watch(keyword, () => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    refresh()
  }, 300)
})
```


## 常见误区 {#common-pitfalls}

### 1. 在页面初始化时直接使用 `$fetch` {#pitfall-direct-fetch}

不推荐：

```javascript
const data = await $fetch('/api/posts')
```

推荐：

```javascript
const { data } = await useFetch('/api/posts')
```

原因是 `useFetch` 可以把服务端请求结果同步到客户端，避免重复请求。

### 2. 在循环中使用相同的 `useAsyncData` Key {#pitfall-duplicate-key}

不推荐：

```javascript
const { data } = await useAsyncData('item', () => $fetch(`/api/items/${id}`))
```

推荐：

```javascript
const { data } = await useAsyncData(`item-${id}`, () => $fetch(`/api/items/${id}`))
```

### 3. 在 Pinia Store 中滥用 `useFetch` {#pitfall-usefetch-in-pinia}

Store 中更推荐使用 `$fetch` 手动管理状态。`useFetch` 更适合组件、页面或组合式函数上下文。

### 4. 忘记处理空数据状态 {#pitfall-empty-state}

接口成功并不代表一定有数据，列表页应该处理空状态。

```vue
<template>
  <div v-if="pending">加载中...</div>
  <div v-else-if="!data?.length">暂无数据</div>
  <ul v-else>
    <li v-for="item in data" :key="item.id">
      {{ item.name }}
    </li>
  </ul>
</template>
```

### 5. 把所有请求都封装成同一个函数 {#pitfall-over-abstraction}

请求封装应该适度。读取型请求、提交型请求、上传型请求的状态管理方式不同，不建议全部塞进一个过度复杂的封装里。


## 参数参考 {#params-reference}

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `server` | `boolean` | `true` | 是否在服务端获取数据。 |
| `lazy` | `boolean` | `false` | 是否在解析路由后才开始获取数据。 |
| `immediate` | `boolean` | `true` | 是否立即执行请求。若设为 `false`，需手动触发 `execute`。 |
| `default` | `function` | - | 为 `data` 提供默认值，避免初始状态为空。 |
| `transform` | `function` | - | 在存储结果前对数据进行转换。 |
| `pick` | `string[]` | - | 只从数据源中提取指定的字段。 |
| `watch` | `boolean \| any[]` | `true` | 是否监听响应式参数变化并自动刷新。 |
| `key` | `string` | 自动生成 | 用于缓存、去重和状态复用的唯一标识。 |
| `query` | `object` | - | 设置 URL 查询参数。 |
| `method` | `string` | `GET` | 设置请求方法，如 `GET`、`POST`、`PUT`、`PATCH`、`DELETE`。 |
| `body` | `object \| FormData` | - | 设置请求体，常用于 `POST`、`PUT`、`PATCH`。 |
| `headers` | `object` | - | 设置请求头。 |
| `baseURL` | `string` | - | 设置请求基础路径。 |
| `timeout` | `number` | - | 设置请求超时时间，单位为毫秒。 |
| `dedupe` | `cancel \| defer` | `cancel` | 控制重复请求的处理方式。 |
| `getCachedData` | `function` | - | 自定义缓存读取逻辑。 |
| `onRequest` | `function` | - | 请求发出前的拦截器。 |
| `onResponse` | `function` | - | 响应成功后的拦截器。 |
| `onRequestError` | `function` | - | 请求发送失败时的拦截器。 |
| `onResponseError` | `function` | - | 响应状态异常时的拦截器。 |


## 返回值参考 {#return-values-reference}

| 返回值 | 类型 | 说明 |
| :--- | :--- | :--- |
| `data` | `Ref` | 请求返回的数据。 |
| `pending` | `Ref<boolean>` | 请求是否正在进行中。 |
| `error` | `Ref` | 请求错误信息。 |
| `status` | `Ref` | 请求状态，如 `idle`、`pending`、`success`、`error`。 |
| `refresh` | `function` | 重新执行请求，常用于刷新当前数据。 |
| `execute` | `function` | 手动执行请求，常配合 `immediate: false` 使用。 |
| `clear` | `function` | 清除当前请求状态、数据和错误。 |


## 推荐项目结构 {#recommended-project-structure}

```text
project/
├── composables/
│   ├── useApi.ts
│   └── useMutation.ts
├── server/
│   └── api/
│       ├── submit.post.ts
│       ├── upload.post.ts
│       └── user.get.ts
├── stores/
│   └── user.ts
└── pages/
    ├── index.vue
    ├── posts/
    │   ├── index.vue
    │   └── [id].vue
    └── profile.vue
```

### `useApi` 适合读取型请求 {#use-api-for-query}

```typescript
// composables/useApi.ts
export const useApi = (url: string, options: any = {}) => {
  const config = useRuntimeConfig()
  const token = useCookie('auth_token')

  return useFetch(url, {
    baseURL: config.public.apiBase,
    ...options,
    onRequest({ options }) {
      if (token.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token.value}`
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        return await navigateTo('/login')
      }
    }
  })
}
```

### `useMutation` 适合提交型请求 {#use-mutation-for-command}

```typescript
// composables/useMutation.ts
export const useMutation = () => {
  const pending = ref(false)
  const error = ref(null)

  const mutate = async (callback: () => Promise<any>) => {
    pending.value = true
    error.value = null

    try {
      return await callback()
    } catch (err) {
      error.value = err
      throw err
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    mutate
  }
}
```


## 实战选择清单 {#practical-checklist}

开发时可以按下面的规则快速判断：

*   **页面首屏数据**：使用 `useFetch`。
*   **多个接口聚合**：使用 `useAsyncData` + `Promise.all`。
*   **按钮点击提交**：使用 `$fetch`。
*   **上传文件**：使用 `$fetch` + `FormData`。
*   **需要隐藏 API Key**：创建 Server Route，再由服务端使用 `$fetch` 请求外部接口。
*   **详情页不存在时返回 404**：`useFetch` 后判断结果，并使用 `createError`。
*   **登录态 SSR 请求**：考虑使用 `useRequestFetch`。
*   **Store 中请求数据**：使用 `$fetch`，不要滥用 `useFetch`。
*   **搜索输入请求**：使用 `immediate: false` + 防抖 + `refresh`。
*   **提交后刷新列表**：提交使用 `$fetch`，列表使用 `useFetch` 的 `refresh`。
*   **减少 SSR Payload**：使用 `pick` 或 `transform`。
*   **避免重复请求**：设置稳定且唯一的 `key`。