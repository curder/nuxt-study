# Nuxt 4 的 `shared/` 目录 {#nuxt-4-shared-directory}

Nuxt 一直有一个清晰的架构边界：**服务端（server，由 Nitro 驱动）**与**客户端（app，由 Vue 驱动）**是两套相对独立的运行环境。

这种分离在大多数场景下是好事，因为不会希望一个依赖 Redis 缓存的存储操作跑在浏览器里，也不希望一个 Pinia store 跑在服务端。

但有一类代码偏偏是 **contextless（与运行上下文无关）** 的：比如一个把字符串首字母大写的 `capitalize` 函数，或者一些纯粹的业务逻辑、格式化工具、共享的类型定义。

它们只是一段普通 JavaScript/TypeScript，既能在 Vue 组件里用，也能在 server API 里用，跟谁跑没关系。

问题在于，Nuxt 3 的目录结构没有为这类"跨端共享"代码提供原生位置：

- 放在 `app/utils/`（或旧的根 `utils/`），只能被客户端自动导入（auto-import），server 端用不了。
- 放在 `server/utils/`，只能被服务端自动导入，客户端用不了。

于是开发者只能妥协，常见的"笨办法"有两种：

**办法一：复制粘贴**

在 `server/utils/format.ts` 里再抄一份同样的 `capitalize`，造成代码重复，维护时两边都得改。

**办法二：在 server 端 re-export**

```ts
// server/utils/format.ts
import { capitalize } from '~/utils/format' // 或相对路径
export { capitalize }
```

虽然能跑，但本质上还是把 server 和 client 两个上下文搅在了一起，既不优雅也不清晰。

Nuxt 4 引入的 `shared/` 目录，正是为了终结这种尴尬，它给 contextless 的代码一个"名正言顺的家"。

## 为什么需要单独的 `shared/` 目录 {#why-need-shared-directory}

Nuxt 4 的新目录结构把应用代码收拢进 `app/`，服务端代码留在 `server/`，二者并列。

新增的 `shared/` 与它们同级，专门存放"既不属于 Vue、也不属于 Nitro"的纯逻辑代码。

它的价值不止"方便导入"这么简单，更在于**语义表达**：当把一个函数放进 `shared/`。

就等于在代码里声明"这段逻辑是上下文无关的，两端都可以安全使用"，这种约定比注释或口头规范更可靠。

官方文档对此有明确约束：`shared/` 目录中的代码**不能导入任何 Vue 或 Nitro 代码** [Nuxt Docs](https://nuxt.com/docs/4.x/directory-structure/shared)。

这从机制上防止了误把依赖浏览器/服务端运行时的代码塞进来。

## `shared/` 的自动导入扫描规则 {#shared-auto-import}

并非 `shared/` 下所有文件都会被自动导入，只有两个固定子目录会：

| 路径                             | 是否自动导入                    |
|----------------------------------|---------------------------------|
| `shared/utils/` 直接子文件       | 是                              |
| `shared/utils/` 的子目录里的文件 | 否（除非额外配置）              |
| `shared/types/` 直接子文件       | 是                              |
| `shared/types/` 的子目录里的文件 | 否（除非额外配置）              |
| `shared/` 根目录或其他位置的文件 | 否，需手动用 `#shared` 别名导入 |

其扫描方式与 `app/utils/`、`app/composables/` 完全一致 [Nuxt Docs](https://nuxt.com/docs/4.x/directory-structure/shared)。

目录结构示例：

```
shared/
├── capitalize.ts          # 不会被自动导入
├── formatters/
│   └── lower.ts           # 不会被自动导入
├── utils/
│   ├── lower.ts           # 自动导入
│   └── formatters/
│       └── upper.ts       # 不会被自动导入
└── types/
    └── bar.ts             # 自动导入
```

对于不在自动导入范围内的文件，Nuxt 自动配置了 `#shared` 别名，可手动导入：

```ts
import capitalize from '#shared/capitalize'
import lower from '#shared/formatters/lower'
import upper from '#shared/utils/formatters/upper'
```

## 在 Nuxt 3.14+ 手动实现 `shared/` {#shared-directory-in-nuxt-3-14}

它本质只是目录约定 + 自动导入配置，完全可以在 Nuxt 3.14+（已支持该目录）上手动落地，提前享受这套结构。

### 1. 创建目录与文件 {#create-shared-directory}

在项目根目录下，与 `app/`、`server/`、`public/` 同级创建 `shared/`，并在其中建 `utils/` 和 `types/`：

```
shared/
├── utils/
│   └── format.ts
└── types/
    └── index.ts
```

把原来 `app/utils/format.ts` 里的 `capitalize` 整体搬过来：

```ts
// shared/utils/format.ts
export const capitalize = (input: string) => {
  return input ? input[0].toUpperCase() + input.slice(1) : ''
}
```

如果 `server/utils/` 里只有为复用而 re-export 的内容，可以一并删掉。

### 2. 配置客户端自动导入 {#client-auto-import}

在 `nuxt.config.ts` 的 `imports.dirs` 里加入 shared 目录。

关键细节：**`imports.dirs` 的路径基于 source directory（即 `app/`）解析**，所以必须写 `./` 前缀才能指向上层的 `shared/`：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: ['./shared/utils', './shared/types'] // [!code ++]
  }
})
```

如果不加 `./`，解析会以 `app/` 为基准，找不到 `shared/`。

### 3. 配置服务端（Nitro）自动导入 {#server-auto-import}

Nitro 侧的配置写法几乎一样，但**路径解析基准不同**：Nitro 的 `imports.dirs` 基于**项目根目录**解析，所以这里**不带 `./`**：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: ['./shared/utils', './shared/types']
  },
  nitro: {
    imports: {
      dirs: ['shared/utils', 'shared/types'] // [!code ++]
    }
  }
})
```

这个 `./` 有无的差异，是手动实现时最容易踩的坑。

### 4. 验证类型自动导入 {#verify-type-auto-import}

在 `shared/types/index.ts` 定义一个类型：

```ts
// shared/types/index.ts
export type MyType = Record<string, 'test' | '10K' | 'subscribers' | 'yay'>
```

然后在 `app/app.vue` 和 `server/api/` 下都能直接使用 `MyType`，无需 import 语句，IDE 跳转也能正确指向 `shared/types/index.ts`。

服务端使用示例：

```ts
// server/api/test.get.ts
export default defineEventHandler(() => {
  const data: MyType = { foo: 'test' }
  return { hello: capitalize('hello'), data }
})
```

把上面的流程浓缩成可直接照做的步骤：

1. 在项目根目录创建 `shared/utils/` 与 `shared/types/` 两个子目录。
2. 将两端都要用的工具函数移入 `shared/utils/`（如 `format.ts`），共享类型移入 `shared/types/`（如 `index.ts`），均用 `export` 导出。
3. 删除 `server/utils/` 中仅为转发而存在的 re-export 文件。
4. 在 `nuxt.config.ts` 的 `imports.dirs` 加入 `'./shared/utils'`、`'./shared/types'`（带 `./`）。
5. 在 `nuxt.config.ts` 的 `nitro.imports.dirs` 加入 `'shared/utils'`、`'shared/types'`（不带 `./`）。
6. 在组件与 server API 中直接调用 `capitalize()` 或使用 `MyType`，确认无需 import 且 IDE 跳转正确。

## 注意事项 {#notes}

- **路径前缀的差异是最大坑点。**

  `imports.dirs`（客户端）基于 source directory 解析，需写 `./shared/...`；`nitro.imports.dirs` 基于 root directory 解析，写 `shared/...`。

  两边写错一个字符，自动导入就失效，且报错信息有时并不直观。

- **自动导入只扫一层。**

  `shared/utils/formatters/upper.ts` 这种子目录嵌套文件默认不会被自动导入。

  如果确实需要嵌套结构，要么把文件提到 `shared/utils/` 根层，要么把这些子目录也显式加进 `imports.dirs` 和 `nitro.imports.dirs`。

- **`shared/` 不放上下文相关代码。** 

  一条经验法则：凡是依赖 `window`、`document`、Vue 响应式 API、Pinia、H3 helper、Nitro 运行时上下文的代码，都不该出现在这里。

  手动实现阶段没有强制保护，全靠自觉；升级到官方集成后会有 import protection 兜底。

- **优先等官方集成，再补手动配置。** 

  手动方案只是过渡期的占位写法，它在标准化、样板代码、以及 import protection 上都不如官方 PR 完整。

  如果项目还没上线或可以等，建议等对应 minor 版本发布后直接用原生 `shared/`，省去 `nuxt.config.ts` 里的额外配置。

- **`#shared` 别名是兜底手段。** 

  当某个文件不适合放在 `shared/utils/` 或 `shared/types/`（例如放在 `shared/` 根目录或嵌套子目录），可以用 `import xxx from '#shared/xxx'` 手动导入，Nuxt 已自动配置好这个别名 [Nuxt Docs](https://nuxt.com/docs/4.x/directory-structure/shared)。