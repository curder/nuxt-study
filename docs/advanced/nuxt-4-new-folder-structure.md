# Nuxt 4 全新目录结构 {#nuxt-4-new-folder-structure}

Nuxt 4 正在逐渐成型，它带来的改动远没有当年 Nuxt 2 升级到 Nuxt 3 那么剧烈，只有少量破坏性变更（breaking changes），并且可以提前通过兼容性标志（compatibility flag）主动开启。

其中最值得关注、影响面标记为「significant」的一项，就是**全新的目录结构（directory structure）**。

这次调整要解决的核心痛点有三个：

| 痛点         | 旧结构的问题                                             | 新结构如何改善                      |
|------------|----------------------------------------------------|------------------------------|
| 前后端边界模糊    | 前端代码与服务端代码混在项目根目录，容易误从 server 引入不该用的东西             | `app/` 与 `server/` 物理隔离，边界清晰 |
| Dev 模式性能差  | 监听整个项目根目录，会连带监听 `.git`、`node_modules`，Windows 上尤其卡 | 只监听 `app/`，减少文件监听范围          |
| 类型与 IDE 体验 | 源码目录不独立，类型推断和 type check 不够精准                      | 独立源码目录带来更好的类型安全              |

## 前置准备 {#preparation}

### 概念解释 {#concept}

Nuxt 4 的新结构并非默认强制，而是通过 `future.compatibilityVersion` 这个兼容性标志来开启。

要使用它，Nuxt 版本至少需要 **3.12 或更高**，否则只能走 nightly 模式。

### 关键步骤 {#key-steps}

先检查当前版本：

```bash
pnpm nuxi
# 输出中会显示 Nuxt 3.12，说明满足要求
```

启动开发服务器：

```bash
pnpm dev
```

在 `nuxt.config.ts` 中开启兼容版本 4：

```ts
export default defineNuxtConfig({
  future: {
    // 注意这里是数字类型（integer / number）
    compatibilityVersion: 4,
  },
})
```

开启后会发现，**没有任何报错**。

这是刻意设计的：Nuxt 保证你可以保留旧项目而无需强制迁移。

如果检测到顶层还有 `pages/` 目录，它会自动回退（fall back）到旧结构。

## `app/` 目录 {#app-directory}

### 概念解释 {#concept-explanation}

新结构的核心思想是把所有 Nuxt 相关的「前端」内容都收进一个 `app/` 文件夹。

也就是说，原本散落在根目录的 `pages/`、`components/`、`layouts/`、`middleware/`，以及 `app.vue`，全部搬进 `app/` 之内。

```
app/
├── app.vue
├── pages/
│   ├── index.vue
│   └── users/
├── components/
│   └── MyComponent.vue
├── layouts/
└── middleware/
```

`app/app.vue` 这种写法初看有点怪，官方在 RFC（由 Sebastian 于当年 3 月发起）里讨论过 `ui`、`web`、`frontend`、`client` 甚至 `nuxt + nitro` 等命名，但都不够贴切，因为这里不仅仅是前端部分。最终定名为 `app`。

### 自定义源码目录名 {#custom-srcdir}

如果不喜欢 `app` 这个名字，命名完全可自定义。

通过 `srcDir` 指向想要的目录即可：

```ts
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },
  // 把源码目录改成 my-fancy-app/
  srcDir: 'my-fancy-app',
})
```

保存后等待 Nuxt 重启，刷新浏览器即可确认应用照常运行。原则上**建议遵循默认命名**，除非你有内部结构约束等充分理由。

## 服务端与顶层目录 {#server-and-top-level-directories}

### `server/` 目录保持独立 {#server-directory}

`server/` 目录**不应**移入 `app/`，这正是新结构的关键。

它承载 API 路由、server routes、Nitro middleware、Nitro plugins 等服务端逻辑。

把前端与服务端拆成两个平级目录的好处：

- 类型与全局可用内容互相隔离，避免从 server 误引前端专用的东西；
- 更容易给出正确引导，比如提醒你**不要在服务端使用 Vue 的 composables（组合式函数）**；
- 性能层面：只监听 `app/` 而不是整个根目录，避免连带监听 `.git` 与 `node_modules`，显著改善 Windows 上的 Dev 体验（file watch 仅在 Dev 阶段生效，不影响生产构建）。

### 保留在根目录的顶层文件夹 {#top-level-directories}

```
project-root/
├── app/          # 前端源码
├── server/       # 服务端逻辑
├── public/       # 静态资源，直接映射到域名根路径
├── modules/      # 本地模块，自动注册
├── layers/       # 新增：Nuxt 层
└── nuxt.config.ts
```

- **`public/`**：静态资源目录，行为与旧版一致。例如放入 `public/test.txt`：

```bash
# 访问 localhost:3000/test.txt 即可直接拿到文件内容
```

它既不属于纯前端也不属于 Nitro，因此留在顶层最合理。

- **`modules/`**：Nuxt 会自动注册此目录下的本地模块，在 Nuxt 3 中无需兼容标志即可用。因为模块可同时涉及前端与服务端，所以也留在顶层。

- 也可以自由在顶层新建如 `types/` 这类同时服务于前后端的目录。

## `layers/` 目录 {#layers-directory}

**Nuxt Layers（层）** 允许把应用拆成一个个「迷你应用」，或反过来在基础应用之上叠加构建，常用于白标（white label）、多套设计主题，以及领域驱动设计（DDD, Domain-Driven Design）。

Nuxt 4 下可直接用一个顶层 `layers/` 文件夹作为起点，甚至无需在 `nuxt.config.ts` 里登记。

### 关键步骤与示例 {#key-steps-and-example}

在 `layers/` 下创建一个层，包含它自己的 `nuxt.config.ts` 和组件：

```
layers/
└── my-awesome-layer/
    ├── nuxt.config.ts
    └── components/
        └── LayerComponent.vue
```

```vue
<!-- layers/my-awesome-layer/components/LayerComponent.vue -->
<template>
  <h1>Hey from layer</h1>
</template>
```

在主应用中直接使用该组件（得益于自动导入）：

```vue
<!-- my-fancy-app/pages/index.vue -->
<template>
  <div>
    <LayerComponent />
  </div>
</template>
```

刷新页面即可看到 `Hey from layer`。之后还能在主应用中覆盖（override）这些层组件。这种「从简单文件夹起步」的分层能力，是许多其他元框架（meta framework）所不具备的，能让庞大单体应用的拆分变得非常轻松。

## `dir.app` 与旧 `app/` 文件夹的区别 {#dir-app-vs-old-app-folder}

这里有个容易混淆的点：**很多老项目本来就有一个 `app/` 文件夹**，里面通常放 `router.options.ts` 或 SPA loading template。它与新的「源码目录 `app/`」并非同一概念。

- `router.options.ts`：用于配置路由行为，如 `scrollBehavior`、自定义路由、子域名定义等；
- SPA loading template：SPA 应用加载时的自定义 loading 动画。

升级指南建议：这两个文件通常**放在源码目录下即可**，保持不动。如果想改它们所在的目录名，可用 `dir.app` 配置：

```ts
export default defineNuxtConfig({
  dir: {
    // 把原 app 相关目录重命名为更语义化的名字
    app: 'app-extras',
  },
})
```

不过将这些文件与 `app.vue` 及其他目录放在一起（collocate）通常更合理，数量也不多，不会显得杂乱。

## 别名（alias）的破坏性变更

### 注意事项

如果你没有使用自动导入（Auto Imports），而是靠 `~` 或 `@` 别名手动引入，那么这次要特别注意，**单双别名指向发生了变化**：

| 别名             | 旧结构指向 | 新结构指向       |
|----------------|-------|-------------|
| `~~` / `@@`（双） | 项目根目录 | 项目根目录（不变）   |
| `~` / `@`（单）   | 项目根目录 | `app/` 源码目录 |

也就是说，过去单别名与双别名都指向项目根目录；现在单别名指向 `app/`。如果你从顶层目录引入类型，就需要改用双别名 `~~` / `@@`：

```ts
// 从顶层 types 目录引入，需用双别名
import type { MyType } from '~~/types'
```

好消息是你**不可能漏掉**这个问题，IDE、type check 或构建时都会直接报错提示找不到文件。

## 迁移步骤 {#common-migration-steps}

将迁移动作浓缩为以下几步：

1. **确认版本**：运行 `pnpm nuxi` 确认为 Nuxt 3.12+，否则升级或用 nightly。
2. **开启兼容标志**：在 `nuxt.config.ts` 设置 `future.compatibilityVersion: 4`。
3. **建立 `app/` 目录**：把 `assets`、`components`、`composables`、`pages`、`layouts`、`middleware`、`app.vue` 全部移入（可参考官方升级指南的完整清单）。
4. **保持 `server/` 独立**：服务端逻辑不要移进 `app/`。
5. **确认顶层目录**：`public/`、`modules/`、`layers/` 留在根目录。
6. **（可选）自定义命名**：用 `srcDir` 改源码目录名，用 `dir.app` 改 app 相关目录名。
7. **修正别名引用**：把指向顶层的 `~`/`@` 单别名改为 `~~`/`@@` 双别名，按报错逐个修复。

## 注意事项 {#caution}

- **可以不迁移，但强烈建议迁移**：不开启也能跑（自动回退旧结构），但会错过 Dev 性能、IDE 类型安全与 type check 的提升。
- **兼容版本号是数字**：`compatibilityVersion: 4` 要写成数字而非字符串。
- **别在 server 端用 Vue composables**：新结构的目录隔离正是为了在你误用时给出更清晰的引导。
- **Windows 用户收益最大**：旧结构监听整个根目录导致的 Dev 卡顿，在新结构下明显缓解。
- **命名自由但慎用**：`srcDir`、`dir.app` 都可自定义，但没有充分理由时应遵循官方默认，以获得最佳约定式支持。
- **官方升级指南是权威来源**：`nuxt.com` 的 upgrade guide 提供了逐项迁移的完整清单，迁移时对照执行更稳妥。