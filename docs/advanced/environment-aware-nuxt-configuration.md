# 让 Nuxt 配置感知环境 {#environment-aware-nuxt-configuration}

应用终于上线了，但一个现实问题随之而来：**如何让某些配置、甚至整个模块只在开发环境（development）加载，或只在生产环境（production）生效？** 测试环境（test）能不能再来一套？

最常见的做法是在 `nuxt.config.ts` 里手写 `process.env.NODE_ENV === 'production' ? ... : ...` 这样的三元判断。

它能用，但有两个毛病：一是配置文件里散落大量条件分支，可读性差；二是字符串比较容易写错、难以类型约束，属于「能跑但脆弱」的方案。

Nuxt 提供了一种 **更具描述性、更防呆（foolproof）** 的方式，环境感知配置（environment-aware configuration）。

它让你把「某环境专属的配置」集中声明在专门的顶层键下，而不是把判断逻辑撒得到处都是。

## 按环境改变标签页标题 {#tab-title-demo}

让浏览器标签页标题（tab title）在不同环境显示不同内容，从而一眼就能看出当前跑的是哪套环境。

基础配置通过 `app.head.title` 设置：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      title: 'My App'
    }
  }
})
```

目标是：开发环境显示带标记的标题，生产环境显示正式标题。

### `$development` 在开发环境配置 {#development}

Nuxt 支持在配置对象里使用以 `$` 开头的**环境专属顶层键**。放在 `$development` 下的配置只会在开发模式生效：

```ts
export default defineNuxtConfig({
  app: {
    head: {
      title: 'My App'
    }
  },
  // ✅ 仅在开发环境下合并生效
  $development: {
    app: {
      head: {
        title: 'My App (DEV)'
      }
    }
  }
})
```

其行为是**深度合并（merge）**：`$development` 里的字段会覆盖顶层同名字段，未提及的字段则保留顶层的值。

### `$production` 覆盖生产环境 {#production}

同理，生产环境专属配置放进 `$production`：

```ts
export default defineNuxtConfig({
  app: {
    head: {
      title: 'My App'
    }
  },
  $development: {
    app: { head: { title: 'My App (DEV)' } }
  },
  // ✅ 仅在生产构建/运行时生效
  $production: {
    app: { head: { title: 'My App' } }
  }
})
```

这样一来，两套环境的差异被清晰地分区声明，而不是塞进一个三元表达式里。

## Nuxt 如何决定 NODE_ENV {#node-env}

这里有个容易被忽视的关键点：**这些环境键的判定依赖于 `NODE_ENV`，而 Nuxt 会主动帮你设置它**。

下面是 Nuxt 的默认行为：

- 运行 `nuxt dev` 时，`NODE_ENV` 被设为 `development`，因此 `$development` 生效。
- 运行 `nuxt build` / 生产构建时，`NODE_ENV` 被设为 `production`，因此 `$production` 生效。

也就是说，通常不需要手动导出 `NODE_ENV`，Nuxt 的命令已经替你安排好了。

检查生产构建产物即可验证：`$production` 下的标题确实被应用了。

## 自定义任意环境名 {#env}

除了内置的 `$development` 和 `$production`，Nuxt 还支持通过 `$env` 定义**任意命名的环境**，配合 `--envName` 标志激活。

这在需要 `staging`、`test` 等额外环境时非常有用：

```ts
export default defineNuxtConfig({
  app: {
    head: { title: 'My App' }
  },
  // ✅ 自定义命名环境
  $env: {
    staging: {
      app: {
        head: { title: 'My App (Staging)' }
      }
    }
  }
})
```

激活方式是在命令中传入对应的环境名：

```bash
nuxt build --envName staging
```

这样便可以脱离 `development`/`production` 的二元框架，按需扩展出任意多套环境配置。

## c12 在做什么 {#c12}

这套机制并非 Nuxt 独创的魔法，而是由 [c12](https://github.com/unjs/c12)（UnJS 生态的配置加载库）提供的能力。

c12 负责加载并**合并（merge）**配置，其中就包含对 `$` 前缀环境键的解析。

它读取当前 `NODE_ENV`（或 `--envName` 指定的名称），把对应键下的配置深度合并到基础配置之上。

理解这一点的价值在于**同样的能力在其他基于 c12 的工具里也通用**，并非 Nuxt 专属语法。

## 常见案例 {#common-cases}

1. **确定基础配置**：先在 `nuxt.config.ts` 顶层写好各环境通用的默认值。
2. **抽出开发差异**：把仅开发用的配置（调试标题、devtools、mock 模块等）放进 `$development`。
3. **抽出生产差异**：把仅生产用的配置（正式域名、分析脚本、压缩选项等）放进 `$production`。
4. **依赖 Nuxt 的默认 NODE_ENV**：`nuxt dev` → development，`nuxt build` → production，无需手动导出。
5. **需要更多环境时用 `$env`**：定义 `staging`、`test` 等命名环境，用 `nuxt build --envName <name>` 激活。
6. **验证产物**：检查对应环境的构建结果，确认目标键下的配置确实被合并应用。

## 注意事项 {#cautions}

| 事项                               | 说明                                                     |
|----------------------------------|--------------------------------------------------------|
| **优先用 `$` 键而非 `process.env` 判断** | 更具描述性、更防呆，配置意图一目了然。                                    |
| **合并是深度 merge**                  | 环境键只覆盖同名字段，未声明的字段沿用顶层默认值。                              |
| **NODE_ENV 由 Nuxt 命令设置**         | `dev` → development、`build` → production，通常无需手动指定。     |
| **自定义环境靠 `$env` + `--envName`**  | 内置只有 dev/prod 语义键，其他环境名走 `$env`。                       |
| **底层是 c12**                      | 这套能力来自 UnJS 的 c12，在其他基于它的工具中同样适用。                      |
| **配合 runtimeConfig 使用**          | 环境键管「构建/配置层面」的差异；运行时可变值仍应交给 `runtimeConfig`（并注意其常见误用）。 |

环境键适合处理「构建期就能确定」的差异（是否启用某模块、标题、静态开关等）。

若某个值需要在部署后通过环境变量注入、或在运行时动态读取，仍应放进 `runtimeConfig` 并用 `NUXT_` 前缀的环境变量覆盖，二者职责不同、可以互补。
