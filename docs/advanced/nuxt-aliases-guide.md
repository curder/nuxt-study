# Nuxt 路径别名 {#nuxt3-aliases-guide}

Nuxt 3 内置 `@`、`~`、`@@`、`~~` 等文件别名与 `#imports` 等哈希别名，并支持自定义别名，本文讲清各自含义、如何扩展，以及什么时候「不该」用它们。

导入文件时，相对路径（relative path）是最常见的写法，例如 `../../../components/AppNumber.vue`。

它在文件不动时没问题，但一旦**移动了所在文件**，这些 `../` 的层级就要全部重算、逐个更新，既繁琐又容易出错。

Nuxt 3 为常用目录提供了一套**路径别名（Alias）**机制，用固定的短前缀指向项目里的关键位置，无论文件被移动到哪一层，导入路径都保持稳定。

除了内置别名，Nuxt 还允许你定义自己的别名。

## 一、别名要解决的问题 {#alias-problem}

相对路径的核心痛点有二：**可读性差**（一长串 `../` 难以一眼看出指向何处）和**脆弱性高**（移动文件即失效）。

别名用一个语义化的短前缀锁定目标目录，把「相对于当前文件」变成「相对于项目根/源码目录」，从而与文件位置解耦。

## 二、文件别名：`@` 与 `~` {#alias-at-tilde}

Nuxt 内置了两个最常用的文件别名 `@` 和 `~`，二者**指向相同的位置**，即应用的源码目录（source directory）。

```ts
// 用别名代替一长串相对路径
import AppNumber from '~/components/AppNumber.vue'
import AppNumber from '@/components/AppNumber.vue'
```

`@` 和 `~` 在 Nuxt 里是等价的，选哪个取决于团队习惯，保持一致即可。它们默认指向 `srcDir`。

## 三、`@@` 与 `~~`：指向项目根目录 {#alias-double-at-tilde}

除了指向源码目录的 `@`/`~`，还有一组双写别名 `@@` 和 `~~`，它们指向的是**项目根目录（rootDir）**。

```ts
// ~~ / @@ 指向项目根目录
import pkg from '~~/package.json'
import pkg from '@@/package.json'
```

区别的意义在于：当配置了独立的源码目录（例如把应用代码放进 `src/`）时，`~`/`@` 会指向 `src/`，而 `~~`/`@@` 仍指向真正的项目根。

二者的分工在有 `srcDir` 的项目里尤为重要，**源码内资源用 `~`/`@`，项目级文件（如根目录配置）用 `~~`/`@@`**。

## 四、自定义别名 {#alias-custom}

当某个深层目录被频繁引用时，可以在 `nuxt.config.ts` 里通过 `alias` 字段自定义别名：

```ts
// nuxt.config.ts
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  alias: {
    'assets': fileURLToPath(new URL('./assets', import.meta.url)),
    'my-lib': fileURLToPath(new URL('./lib', import.meta.url))
  }
})
```

之后即可用 `my-lib/...` 直接引用，无需再写相对路径。

自定义别名要指向明确的绝对路径，推荐用 `fileURLToPath` + `import.meta.url` 生成，避免解析歧义。

## 五、哈希别名（Hash imports）：#imports 等 {#hash-imports}

Nuxt 还有一类以 `#` 开头的**哈希别名**，它们并不直接对应某个物理目录，而是由 Nuxt 在构建时提供的「虚拟」入口。

最典型的是 `#imports`：

```ts
// 显式从 #imports 引入 Nuxt/Vue 的自动导入 API
import { ref, computed, useState } from '#imports'
```

`#imports` 汇集了 Nuxt 的自动导入（auto imports）能力。

虽然平时得益于自动导入你可以不写 import，但在某些场景（如需要显式导入、或让工具/测试正确解析）下，从 `#imports` 显式引入会更稳妥。

其他哈希别名（如指向构建产物的 `#build` 等），它们同属这套由框架维护的虚拟别名体系。

## 六、别名的坑（Gotchas）：什么时候不要用 {#alias-gotchas}

别名虽好，但**并非所有位置都能识别它们**：

- **并非全局通用**：别名主要在被 Nuxt/Vite 处理的上下文（如组件、TS/JS 模块）里生效。在一些**不经过 Nuxt 解析的文件或配置**中，别名可能无法被正确解析。
- **配置文件中慎用**：某些配置或工具链读取路径时不走 Nuxt 的别名解析，此时应老实用相对路径或 `fileURLToPath` 生成绝对路径。
- **第三方工具的解析**：并非所有编辑器、类型检查或外部工具都天然认识你的自定义别名，可能需要在 `tsconfig` 等处同步声明才能获得跳转与类型提示。

别名适合应用代码内部的常规导入；一旦进入「构建/配置边界」或交给不理解别名的工具处理时，就该退回到明确的路径写法，避免出现「能跑但工具报红」或「解析失败」的问题。

## 常见案例 {#common-cases}

1. **源码内导入用 `~`/`@`**：把冗长相对路径替换为 `~/components/...`，指向源码目录。
2. **根目录资源用 `~~`/`@@`**：引用 `package.json` 等项目根文件时用双写别名。
3. **高频深层目录设自定义别名**：在 `nuxt.config.ts` 的 `alias` 里用 `fileURLToPath` 定义。
4. **显式自动导入用 `#imports`**：需要明确 import 时从 `#imports` 引入 Nuxt/Vue API。
5. **配置/工具边界退回相对路径**：不经 Nuxt 解析的地方老实写相对路径或绝对路径。
6. **同步声明给工具链**：自定义别名时在 `tsconfig` 等处补充映射，保证类型与跳转正常。

## 注意事项 {#alias-notes}

| 事项                    | 说明                                          |
|-----------------------|---------------------------------------------|
| **`@` 与 `~` 等价**      | 都指向源码目录（`srcDir`），选一种并保持团队一致。               |
| **`@@` / `~~` 指向根目录** | 指向 `rootDir`；配了 `src/` 源码目录时与 `~`/`@` 区别明显。 |
| **自定义别名要用绝对路径**       | 推荐 `fileURLToPath(new URL(...))`，避免解析歧义。    |
| **`#` 别名是虚拟入口**       | 如 `#imports`、`#build`，由框架构建期提供，非物理目录。       |
| **别名并非全局生效**          | 只在被 Nuxt/Vite 处理的上下文可靠；配置/外部工具可能不认。         |
| **工具需同步声明**           | 自定义别名要在 `tsconfig` 等处映射，才有类型提示与跳转。          |

Nuxt 会自动生成 `.nuxt/tsconfig.json`，其中已包含内置别名的路径映射，因此内置别名通常开箱即用；

但**自定义别名**未必被所有工具链自动识别，若遇到 IDE 无法跳转或类型报错，检查是否需要在项目的 `tsconfig.json` 里 `extends` 生成的配置或手动补 `paths`。

此外，别名解析在**服务端目录（`server/`，由 Nitro 处理）**与前端（Vite 处理）中机制不同，跨端共享代码时要留意别名在两侧是否都可用，必要时用 Nitro 侧的别名配置或相对路径兜底。