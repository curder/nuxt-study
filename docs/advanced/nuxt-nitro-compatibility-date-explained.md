# Nuxt 与 Nitro 的兼容性日期（compatibilityDate）{#nuxt-nitro-compatibility-date-explained}

在升级到 Nuxt 3.12 或更高版本时，命令行 CLI 会弹出提示，询问你是否要设置一个 `compatibilityDate`。

如果选择了"是"，它会在 `nuxt.config.ts` 中写入类似 `compatibilityDate: '2026-07-23'` 的配置。

核心痛点在于： **Nitro 依赖大量部署预设（presets）来适配不同云平台，而这些平台会随时更新自己的运行时行为。**

当某个平台（比如 Cloudflare、Netlify）改变了行为或引入了破坏性变更（breaking change），Nitro 的 preset 也必须跟着适配。

如果仅靠 SemVer，一个你不用的平台发生变更，就会迫使整个框架发一个 major 版本，所有用户都得跟着升级——这显然不合理。

兼容性日期就是为了解决这个问题而引入的：它让你能在框架版本不变的前提下，独立控制"何时开始采用某个平台的新行为"。

## 为什么需要 `compatibilityDate` {#why-compatibility-date}

Nitro 内置了大量部署预设，每个预设对应一个部署平台。

以 Netlify 为例，它就有三种不同的 preset：

| Preset                          | 说明         | 特性                                   |
|---------------------------------|--------------|----------------------------------------|
| `netlify`                       | 默认预设     | 零配置自动检测，使用 Netlify Functions |
| `netlify-edge`                  | 边缘函数预设 | 使用 Deno 运行时，运行在边缘节点       |
| `netlify`（On-Demand Builders） | 按需构建器   | Netlify 特有的增量渲染能力             |

这些平台的行为并非一成不变。当某个平台发布破坏性更新时，Nitro 需要同步适配。

问题在于： **不是所有用户都用了这个平台。**

如果仅用 SemVer 管理，会出现以下困境：

- 某个冷门 preset 的行为变了 → Nitro 发 major 版本（如 v4）
- 你从没用过那个平台，但为了拿到 bug 修复，不得不跟着升 major
- 或者维护者需要把所有修复向后移植（backport）到旧版本，工作量巨大

这跟 `nuxt/image` 的图片服务商（image providers）、`unstorage` 的存储驱动（drivers）、`nuxt/fonts`
的字体源是同一个道理——它们都有大量外部依赖，行为可能随时变化。

compatibilityDate 的设计目标就是让这些"无法用 SemVer 单独管理的东西"也能被独立版本化。

## 工作机制 {#how-compatibility-date-works}

compatibilityDate 的核心思路是： **只有当你主动提升日期时，才会"选择加入"（opt-in）平台的新行为。**

- 设为今天的日期 → 明天某个平台出了破坏性变更，你的行为 **不会变**，因为你的日期还在变更之前
- 你仍然可以正常升级框架版本，拿到 bug 修复和新功能
- 当你准备好接受平台变更时，手动提升 compatibilityDate 即可

用一张表格梳理 SemVer 与 compatibilityDate 的分工：

| 维度                 | 管理方式              | 包含内容                              |
|----------------------|-----------------------|---------------------------------------|
| 框架 Bug 修复        | SemVer（patch/minor） | Nitro 自身的 bug fix、功能改进        |
| 框架破坏性变更       | SemVer（major）       | Nitro API 的 breaking change          |
| 平台/Preset 行为变更 | compatibilityDate     | 部署预设、provider、driver 的行为变化 |

> Nitro 官方文档明确指出，如果不设置 `compatibilityDate`，Nitro 默认使用 `"latest"` 行为。
>
> 新项目创建时会自动写入当天日期，官方建议定期更新该日期，并在更新后充分测试部署。
>
> [Nitro Deploy Docs](https://nitro.build/deploy)
>
> [Nitro Config Docs](https://nitro.build/config)

## 设置方式 {#how-to-set-compatibility-date}

compatibilityDate 可以用两种形式设置在 `nuxt.config.ts` 中。

**全局字符串形式**（所有平台统一）：

```ts
export default defineNuxtConfig({
    compatibilityDate: '2024-07-03'
})
```

**按平台分别设置（对象形式）**：

更细粒度的配置方式，可以为不同平台设置不同日期：

```ts
export default defineNuxtConfig({
    compatibilityDate: {
        cloudflare: '2024-11-15',
        vercel: '2024-07-03'
    }
})
```

这种按平台粒度控制的方式尤其适用于 `nuxt/image`、`nuxt/fonts` 等模块——比如 Cloudflare 的图片服务可以用最新日期，而
Cloudflare Workers 的 breaking change 你想暂时观望，就保持一个更早的日期。

> 在纯 Nitro 项目中，配置写在 `nitro.config.ts` 中，字段名同样是 `compatibilityDate`，格式要求 `YYYY-MM-DD`。
>
> 也可以通过环境变量 `NITRO_COMPATIBILITY_DATE` 覆盖。

此外，Cloudflare preset 有自己独立的 `compatibility_date` 配置，写在 wrangler 配置中：

```ts
// nitro.config.ts
export default defineConfig({
    cloudflare: {
        wrangler: {compatibility_date: '2025-01-01'}
    }
})
```

这与 Nitro 顶层的 `compatibilityDate` 是两套独立机制：前者控制 Cloudflare Workers 运行时版本，后者控制 Nitro preset
的行为版本。 [Nitro Config Docs](https://nitro.build/config)

## 周边工具与未来规划 {#tools-and-future-plans}

目前 compatibilityDate 处于"基础设施已就位、工具链仍在完善"的阶段：

- **CLI 提示**：升级 Nuxt 时会自动询问是否设置，建议选"是"
- **兜底值**：如果不设置，会回退到一个默认日期（约 4 月 3 日）
- **未来规划**：计划让 CLI 主动告知你"你用过的某个 preset 有更新"，展示差异，由你决定是否 opt-in

即使现在 compatibilityDate "看起来不做太多事"，也建议设置好，为未来工具链完善做准备。

## 其他使用兼容性日期的 API {#other-apis-using-compatibility-date}

兼容性日期并非 Nuxt/Nitro 的独创，不少主流 API 和运行时早已采用类似机制：

| 平台/API           | 机制                 | 用途                               |
|--------------------|----------------------|------------------------------------|
| GitHub API         | API 版本头           | 在不破坏旧消费者的前提下引入新行为 |
| Shopify API        | API 版本号           | 同上                               |
| Cloudflare Workers | `compatibility_date` | 锁定 Workers 运行时版本            |

## compatibilityDate 不管什么 {#compatibility-date-does-not-care}

这是一个容易混淆的点。Nuxt 核心团队负责人 Daniel Roe 在采访中明确总结道：

> "We're not going to be changing Nuxt behavior based on compatibility date. It's the presets under the hood, and it's
> basically trying to figure out how to version stuff that you can't version."

简而言之：

- **不管**：Nuxt 框架本身的行为变更（由 SemVer 和 `future.compatibilityVersion` 管理）
- **不管**：常规 bug 修复（始终通过版本升级获取，与日期无关）
- **只管**：部署预设、provider、driver 等平台特定行为

> Nuxt 4 的框架级行为切换使用的是 `future.compatibilityVersion: 4`，这与 `compatibilityDate` 是完全不同的配置项，不要混淆。
> [Mastering Nuxt](https://masteringnuxt.com/blog/complete-guide-how-to-upgrade-to-nuxt-4)

## 为新项目正确设置 compatibilityDate {#how-to-set-compatibility-date-for-new-projects}

以下是从零开始正确使用 compatibilityDate 的完整步骤：

1. **创建项目时接受 CLI 提示**

   运行 `npx nuxi@latest init` 或升级时，CLI 会询问是否设置 compatibilityDate，选择"是"。

2. **确认配置已写入**

   检查 `nuxt.config.ts`：
   ```ts
   export default defineNuxtConfig({
     compatibilityDate: '2024-07-03'
   })
   ```

3. **按需设置细粒度配置**

   如果部署到多个平台，且希望分别控制行为：
   ```ts
   export default defineNuxtConfig({
     compatibilityDate: {
       cloudflare: '2024-11-15',
       vercel: '2024-07-03'
     }
   })
   ```

4. **升级框架版本不受影响**

   正常运行 `npx nuxi@latest upgrade` 拿到 bug 修复和新功能，平台行为不会因为框架升级而改变。

5. **准备接受平台新行为时提升日期**

   将 `compatibilityDate` 改为目标日期，在本地和 CI 中充分测试后再部署。

6. **使用环境变量覆盖（纯 Nitro 项目）**

   ```bash
   NITRO_COMPATIBILITY_DATE=2025-01-01 nitro build
   ```

## 注意事项

1. **务必设置，不要留空**

   不设置会回退到默认日期，可能不是你期望的行为。官方文档明确表示默认使用 `"latest"` 行为，新项目会自动写入当天日期。

2. **日期格式必须为 `YYYY-MM-DD`**

   这是 ISO 8601 日期格式，不要写成 `DD/MM/YYYY` 或其他形式。

3. **与 `future.compatibilityVersion` 是两回事**

   `future.compatibilityVersion: 4` 控制的是 Nuxt 框架行为（目录结构、异步数据处理等），`compatibilityDate` 控制的是 Nitro
   preset 行为。两者互不影响。

4. **更新日期后务必测试**

   提升日期意味着 opt-in 平台的新行为，可能包含破坏性变更。在 CI 中完整跑一遍部署流程再上线。

5. **使用 Layers 时注意配置写入位置**

   如果项目使用了 Nuxt Layers，CLI 可能将 `compatibilityDate` 写入根目录的 `nuxt.config.ts`，而非你实际使用的 layer
   配置文件。需要手动检查并迁移到正确的配置文件中。 [GitHub Issue #27992](https://github.com/nuxt/nuxt/issues/27992)

6. **某些 Nitro 版本可能忽略该配置**

   有用户报告在 Nuxt 4.0.2 + Nitro 2.12.4 环境下，即使正确设置了 `compatibilityDate`（包括通过 `nuxt.config.ts`、`.env`
   和环境变量），Nitro 仍会显示 fallback 警告并使用默认日期。 遇到此类问题可以关注相关 issue
   的修复进展。 [GitHub Issue #32825](https://github.com/nuxt/nuxt/issues/32825)

7. **Cloudflare 用户需区分两套兼容性日期**

   Nitro 顶层的 `compatibilityDate` 控制 preset 行为，Cloudflare preset 内部的 `wrangler.compatibility_date` 控制 Workers
   运行时版本，两者独立生效，都需要正确设置。