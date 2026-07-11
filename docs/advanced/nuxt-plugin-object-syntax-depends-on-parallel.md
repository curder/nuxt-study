# Nuxt 插件定义执行顺序 {#nuxt-plugin-object-syntax-depends-on-parallel}

Nuxt 插件（Plugin）是应用启动阶段运行的一段初始化代码，常用于注入辅助方法（如 `$api`、`$auth`）、配置第三方库、初始化全局状态。

大多数人写插件时都用函数式语法：

```ts
// plugins/api.ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('api', createApi())
})
```

单个插件时这完全没问题。

但一旦插件之间出现**依赖关系**——比如 `auth` 插件要用到 `api` 插件注入的 `$api`——隐患就来了：**Nuxt 默认按 `plugins/` 目录下的文件名字符串顺序执行插件。**

如果文件命名的字母序恰好让 `auth.ts` 排在 `api.ts` 前面，`auth` 执行时 `$api` 还不存在，应用就会崩溃，抛出类似 `Cannot read properties of undefined` 的错误。

靠给文件加数字前缀（`01.api.ts`、`02.auth.ts`）来「掰」顺序既脆弱又难维护：任何人重命名文件或新增插件都可能悄悄打乱依赖链。

**对象语法（Object Syntax）** 正是为解决这个痛点而生——顺带还带来了并行加载等性能红利。

## 从函数式到对象式 {#object-syntax}

### 复现问题：默认排序的局限 {##default-order-limitations}

先看错误是怎么发生的。两个有依赖关系的插件，用函数式写法时无法在代码层面表达「谁先谁后」：

```ts
// plugins/auth.ts
export default defineNuxtPlugin((nuxtApp) => {
  // 期望此时 $api 已存在，但顺序无法保证
  const api = nuxtApp.$api
  // 若 api 插件尚未执行 → api 为 undefined → 报错
})
```

问题根源在于：函数式写法只提供了「插件要做什么」，却没有任何地方能声明「它要在谁之后做」。执行顺序完全交给了文件名排序这一隐式机制。

### 对象语法：用 name + dependsOn 显式声明依赖 {#explicit-dependency-declaration}

`defineNuxtPlugin` 支持接收第二个参数——一个配置对象。这正是治理依赖的关键。

被依赖的插件先起个名字：

```ts
// plugins/api.ts
export default defineNuxtPlugin(
  (nuxtApp) => {
    nuxtApp.provide('api', createApi())
  },
  {
    name: 'api' // 唯一标识，供其他插件引用
  }
)
```

依赖它的插件用 `dependsOn` 声明前置条件：

```ts
// plugins/auth.ts
export default defineNuxtPlugin(
  (nuxtApp) => {
    const api = nuxtApp.$api // 此时一定已就绪
    // ...
  },
  {
    name: 'auth',
    dependsOn: ['api'] // 必须在名为 'api' 的插件之后执行
  }
)
```

工作原理是：Nuxt 在初始化时根据 `name` 和 `dependsOn` 构建一张依赖图。

**无论文件名如何排序**，只要 `auth` 声明了 `dependsOn: ['api']`，Nuxt 就强制保证 `api` 先跑完。

文件命名技巧从此可以退场。

### 性能优化：parallel 并行执行 {#parallel-execution}

顺序控制之外，对象语法还引入了 `parallel` 选项。对那些**彼此独立、没有依赖关系**的插件（例如一个初始化埋点、一个初始化 UI 提示库），串行等待纯属浪费。

```ts
// plugins/analytics.ts
export default defineNuxtPlugin(
  async (nuxtApp) => {
    await initAnalytics() // 耗时的异步初始化
  },
  {
    name: 'analytics',
    parallel: true // 允许与其他 parallel 插件同时执行
  }
)
```

标记为 `parallel: true` 的插件不会阻塞后续插件的启动，从而缩短应用冷启动时间。作者提到社区已有相关探索（如 Julien Huang 的 all-parallel 模块）尝试自动化这一过程，但手动标记是最可控的方式。

需要强调：**只有确实无依赖的插件才能设 `parallel: true`**。若插件 A 依赖 B 却被标记为并行，就可能出现「抢跑」。

### 高级控制：env 与 enforce {#advanced-control}

对象语法还提供两个更细粒度的属性：

| 属性        | 可选值                               | 作用                                | 默认值         |
|-----------|-----------------------------------|-----------------------------------|-------------|
| `env`     | `'all'` / `'server'` / `'client'` | 控制插件运行环境，避免在无关环境打包/执行代码           | `'all'`     |
| `enforce` | `'pre'` / `'default'` / `'post'`  | 控制插件在初始化流程中的阶段，`pre` 最早、`post` 最晚 | `'default'` |

组合使用示例：

```ts
export default defineNuxtPlugin(
  () => {
    // 访问 window 等仅浏览器可用的 API
  },
  {
    name: 'client-analytics',
    env: 'client',   // 只在客户端运行
    enforce: 'post'  // 在默认插件之后执行
  }
)
```

## 常见步骤 {#common-cases}

1. **识别依赖链**：排查现有插件，找出使用了 `nuxtApp.$xxx` 的插件，确认它依赖哪个插件提供该属性。
2. **改为对象语法**：把插件统一改写成 `defineNuxtPlugin(setup, options)` 形式。
3. **赋予唯一 name**：为每个插件设置清晰的 `name`（建议与文件名对应，但不强制）。
4. **配置 dependsOn**：在有依赖的插件里写入 `dependsOn: ['依赖插件名']`（数组形式）。
5. **标记 parallel**：审查无依赖的独立插件，加 `parallel: true` 优化启动速度。
6. **按需隔离 env**：仅涉及浏览器 API 的插件设 `env: 'client'`，减小服务端负担。

## 注意事项 {##cautions}

| 事项                   | 说明                                                            |
|----------------------|---------------------------------------------------------------|
| **name 必须唯一**        | 它是依赖解析的键，重复会导致不可预期的行为。                                        |
| **dependsOn 是字符串数组** | 即便只依赖一个插件，也要写成 `['api']`，而非 `'api'`。                          |
| **parallel 仅限无依赖插件** | A 依赖 B 时，A 绝不能设 `parallel: true`，否则可能抢跑。                      |
| **向后兼容**             | 旧的函数式写法仍然有效；对象语法是增强而非替代。                                      |
| **面向未来编程**           | 即使当前无依赖，也推荐直接用对象语法，为后续加 `dependsOn` / `parallel` 预留空间，且意图更清晰。 |

在多人协作的大型项目中，建议在 `plugins/` 目录维护一份注释或 README，简述每个插件的 `name` 与职责，方便新人理解依赖图谱，避免误删或乱改 `dependsOn`。
