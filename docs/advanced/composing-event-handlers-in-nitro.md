# Nitro 中组合事件处理器 {#composing-event-handlers-in-nitro}

无论你把 Nitro 作为独立服务运行，还是嵌入 Nuxt 等元框架（meta framework）中，只要用到全栈能力，就几乎一定会写 API 路由（server routes）。

每个路由都是一个事件处理器（event handler），而在真实业务中，这些处理器往往要重复执行一些"前置逻辑"，获取当前用户、校验权限、抛出错误等。

最常见的做法是：写好一套鉴权与权限检查逻辑，然后在每个路由文件里复制粘贴。

路由一多，问题就来了：

- **代码重复（DRY 原则被破坏）**：获取用户、检查权限的代码在每个文件里都写一遍。
- **维护困难**：逻辑一旦变更，要逐个文件修改。
- **可读性下降**：真正"业务逻辑"被淹没在一堆样板代码里。

把公共逻辑抽到 `utils/` 目录是一个进步，但调用处仍然要写两行（获取用户 + 检查权限），而且这两行在每个处理器里几乎一模一样。

下面介绍了一种更彻底的方案 **包装事件处理器（Wrapped Event Handler）模式**，用函数组合（function composition）的方式把前置逻辑封装进一个自定义的 `defineEventHandler` 变体中，让每个路由只关注自己的业务逻辑。

## 起始模板与公共逻辑 {#starting-template}

一个最小化的 Nitro 应用，`server/routes/index.ts` 里是一个标准的事件处理器：

```ts
// server/routes/index.ts
export default defineEventHandler((event) => {
  return 'content'
})
```

随着业务复杂化，需要获取用户并检查权限。先定义类型和两个辅助函数：

```ts
type User = {
  id: string
  name: string
}

async function getCurrentUser(): Promise<User> {
  // 从某处获取用户，不耦合具体实现
  return { id: '1', name: 'test user' }
}

function checkPermission(user: User, permissionString: string): boolean {
  // 示例：50/50 随机判定
  return Math.random() > 0.5
}
```

> 真实项目中权限检查通常基于数据库中用户角色与路由权限字符串的匹配，也可能接入 ACL（Access Control List）库。这里用 `Math.random()` 只是为了演示流程。

在处理器中调用它们：

```ts
// server/routes/index.ts
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser()

  const isAllowed = checkPermission(user, 'index')
  if (!isAllowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'not allowed',
    })
  }

  // 实际业务逻辑
  return 'content'
})
```

`createError` 是 H3 提供的工具函数，用于抛出带状态码和自定义消息的 HTTP 错误。如果 `checkPermission` 返回 `false`，处理器会立即中断并返回 403。

## 问题：复制粘贴的开始 {#problem-copy-paste}

当你新增第二个路由（比如 `users/edit.ts`）时，自然的做法是把上面的代码复制过去，只改业务逻辑和权限字符串：

```ts
// server/routes/users/edit.ts
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser()

  const isAllowed = checkPermission(user, 'users:edit')
  if (!isAllowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'not allowed',
    })
  }

  // 实际业务逻辑（每个路由不同）
  return 'edited'
})
```

可以看出，除了权限字符串和最后的业务逻辑，其余部分完全重复。路由越多，重复越严重。

### 1. 抽取到 `utils` {#extract-to-utils}

把 `getCurrentUser`、`checkPermission` 和 `User` 类型移到 `utils/user.ts`（也可以叫 `auth.ts`），并导出：

```ts
// utils/user.ts
export type User = {
  id: string
  name: string
}

export async function getCurrentUser(): Promise<User> {
  return { id: '1', name: 'test user' }
}

export function checkPermission(user: User, permissionString: string): boolean {
  return Math.random() > 0.5
}
```

> Nitro 的 `utils/` 目录下的导出支持自动导入（Auto Imports），也可以选择手动 `import`。
> 
> 两种方式都可用，取舍可参考关于 Auto Imports 的讨论。

调用处变得简洁了一些，但每个处理器仍需写两行前置逻辑：

```ts
// server/routes/index.ts
export default defineEventHandler(async (event) => {
  const user = await getCurrentUser()
  const isAllowed = checkPermission(user, 'index')
  if (!isAllowed) {
    throw createError({ statusCode: 403, statusMessage: 'not allowed' })
  }
  return 'content'
})
```

### 2. Wrapped Event Handler 模式 {#wrapped-event-handler-pattern}

核心思路：**把"获取用户 + 检查权限 + 抛错"整体封装进一个高阶函数**，这个高阶函数接收权限字符串和实际业务处理器，返回一个标准的 Nitro 事件处理器。

先写出初步版本（类型暂用 `any`，后续再修正）：

```ts
// utils/user.ts
export function defineEventHandlerWithCheckUser(
  permissionString: string,
  handler: any
) {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser()

    const isAllowed = checkPermission(user, permissionString)
    if (!isAllowed) {
      throw createError({
        statusCode: 403,
        statusMessage: 'not allowed',
      })
    }

    return handler(event, user)
  })
}
```

调用处变为：

```ts
// server/routes/users/edit.ts
export default defineEventHandlerWithCheckUser('users:edit', (event, user) => {
  // 只剩业务逻辑
  return 'edited'
})
```

现在每个路由只需写一行权限字符串 + 业务逻辑，前置逻辑全部被封装。

### 3. 补全 TypeScript 类型 {#typescript-typing}

初步版本中 `handler` 类型是 `any`，会导致 `event` 和 `user` 没有类型提示。需要补全泛型。

先观察原生 `defineEventHandler` 的类型签名。当处理器返回 `string` 时，类型是 `Promise<string>`；返回 `number` 时是 `Promise<number>`；返回对象时是 `Promise<object>`，第二个泛型参数始终是返回值的 Promise 化版本。

H3 导出了 `EventHandler` 和 `EventHandlerRequest` 类型。如果自定义处理器只接收 `event` 一个参数，可以直接用 `EventHandler`：

```ts
import type { EventHandler } from 'h3'
```

但由于我们的处理器多了一个 `user` 参数，标准 `EventHandler` 不适用，需要自定义类型：

```ts
// utils/user.ts
import type { EventHandlerRequest, EventHandler } from 'h3'

type EventHandlerWithUser<T extends EventHandlerRequest = EventHandlerRequest, D = unknown> = (
  event: H3Event<T>,
  user: User
) => Promise<D>
```

> 补充：`H3Event` 是 H3 中表示事件的核心类型，带一个泛型参数用于路由参数等的类型推断。`EventHandlerRequest` 是默认的请求类型，可以通过泛型 `T` 扩展以支持动态路由参数的类型提示。

然后给 `defineEventHandlerWithCheckUser` 加上泛型 `T` 和 `D`：

```ts
// utils/user.ts
export function defineEventHandlerWithCheckUser<
  T extends EventHandlerRequest = EventHandlerRequest,
  D = unknown
>(
  permissionString: string,
  handler: EventHandlerWithUser<T, D>
): EventHandler<T, Promise<D>> {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser()

    const isAllowed = checkPermission(user, permissionString)
    if (!isAllowed) {
      throw createError({
        statusCode: 403,
        statusMessage: 'not allowed',
      })
    }

    return handler(event, user)
  })
}
```

完成后，调用处的 `event` 拥有完整类型提示，可以访问 `getRouterParam`、`event.context`、`event.$fetch` 等 H3 提供的能力，动态路由参数也能正确推断；`user` 的类型为 `User`。

### 4. 函数组合 {#function-composition-and-stacking}

这个模式可以进一步堆叠，可以创建一个只负责"获取用户"的包装器，再创建一个负责"检查权限"的包装器，组合使用：

```ts
// 只获取用户，不检查权限
export function defineEventHandlerWithUser<T, D>(
  handler: EventHandlerWithUser<T, D>
): EventHandler<T, Promise<D>> { ... }

// 获取用户 + 检查权限
export function defineEventHandlerWithCheckUser<T, D>(
  permissionString: string,
  handler: EventHandlerWithUser<T, D>
): EventHandler<T, Promise<D>> { ... }
```

这种函数组合（function composition）在后端 JavaScript 生态中并不多见，它提供了一种替代传统中间件（middleware）链的思路：不用挂载一堆中间件，而是通过嵌套包装器来逐层添加能力，有的负责提供数据（如注入用户），有的负责校验并在不通过时提前抛错。

| 对比维度 | 传统中间件             | Wrapped Event Handler  |
|----------|------------------------|------------------------|
| 组织方式 | 全局/路由级中间件链    | 函数嵌套组合           |
| 类型安全 | 中间件内参数往往弱类型 | 泛型可贯穿到业务处理器 |
| 可读性   | 需追踪中间件执行顺序   | 包装器即声明，一目了然 |
| 灵活性   | 适合全局拦截           | 适合按路由定制前置逻辑 |

## 实现带鉴权的事件处理器 {#common-case}

1. **定义业务类型**，在 `utils/user.ts` 中声明 `User` 类型：

```ts
export type User = {
  id: string
  name: string
}
```

2. **实现获取用户与权限检查函数**，并导出：

```ts
export async function getCurrentUser(): Promise<User> {
  // 替换为真实实现
  return { id: '1', name: 'test user' }
}

export function checkPermission(user: User, permissionString: string): boolean {
  // 替换为真实判定逻辑
  return Math.random() > 0.5
}
```

3. **定义带 user 参数的处理器类型**：

```ts
import type { EventHandlerRequest, H3Event } from 'h3'

type EventHandlerWithUser<
  T extends EventHandlerRequest = EventHandlerRequest,
  D = unknown
> = (event: H3Event<T>, user: User) => Promise<D>
```

4. **实现包装器函数**，封装获取用户 + 权限检查 + 抛错：

```ts
// utils/user.ts
import type { EventHandler } from 'h3'

export function defineEventHandlerWithCheckUser<
  T extends EventHandlerRequest = EventHandlerRequest,
  D = unknown
>(
  permissionString: string,
  handler: EventHandlerWithUser<T, D>
): EventHandler<T, Promise<D>> {
  return defineEventHandler(async (event) => {
    const user = await getCurrentUser()

    const isAllowed = checkPermission(user, permissionString)
    if (!isAllowed) {
      throw createError({
        statusCode: 403,
        statusMessage: 'not allowed',
      })
    }

    return handler(event, user)
  })
}
```

5. **在路由中使用**，只写业务逻辑：

```ts
// server/routes/users/edit.ts
export default defineEventHandlerWithCheckUser(
  'users:edit',
  async (event, user) => {
    // event 有完整类型提示，可调用 getRouterParam 等
    // user 类型为 User
    return { success: true, user }
  }
)
```

## 注意事项 {#caveats}

- **类型签名需要手写**。

  H3 的 `EventHandler` 类型只支持单参数 `(event)`，一旦给处理器加了 `user` 参数，就必须自定义类型并手动处理泛型传递。

  这属于一次性成本，写好后可作为 snippet 复用。

- **VS Code 偶尔不识别 H3 类型**。

  `EventHandler` 等类型有时不被 VS Code 自动识别，需要手动 `import type { EventHandler } from 'h3'` 才能生效。

- **权限字符串是约定，不是强制**。
 
  权限检查基于路由字符串，实际项目应根据业务设计。可以基于 URL、基于用户角色、基于 ACL 规则等，切勿照搬 `Math.random()` 示例。

- **包装器可以堆叠但要控制层数**。

  函数组合很灵活，但层数过多会让调用链难以追踪。

  建议最多两层（如"获取用户"+"检查权限"），更复杂的需求考虑拆分为独立函数。

- **`createError` 的 `statusMessage` 可参数化**。

  固定写了 `'not allowed'`，实际可以把它作为包装器的可选参数传入，让不同路由定制错误消息。

- **Auto Imports 在 Nitro 中同样适用**。

  `utils/` 目录下的导出可自动导入，但 Nitro 的自动导入未来可能转为可选（opt-in）特性。

  如果项目希望减少隐式行为，可以改为显式 `import`。

- **业务逻辑是唯一变量**。

  封装后，每个路由文件中唯一变化的是权限字符串和业务逻辑本身，其余全部由包装器处理。

  这正是该模式的价值所在，但也意味着包装器的正确性至关重要，改动时需全量测试。