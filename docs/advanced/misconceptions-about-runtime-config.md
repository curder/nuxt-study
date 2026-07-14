# runtimeConfig 的误区 {#misconceptions-about-runtime-config}

很多人以为在 `nuxt.config.ts` 里用 `process.env` 给 `runtimeConfig` 赋值就能在运行时动态读取环境变量，结果部署后改了 `.env` 却毫无反应——本文讲清楚问题根源，并给出用 `NUXT_` / `NUXT_PUBLIC_` 前缀正确覆盖配置的做法。

`runtimeConfig` 是 Nuxt 3 中用来向应用注入运行时配置（如 API 地址、密钥）的机制。它的价值在于遵循 [12-Factor App](https://12factor.net/) 的理念：**同一份构建产物（build artifact）可以在不同环境中通过环境变量切换配置**，而不需要为 dev / staging / prod 各自重新打包。

但在实际项目、咨询和 code review 中，一个错误用法：开发者在 `nuxt.config.ts` 里把 `process.env.XXX` 直接写进 `runtimeConfig`，然后期望**部署后修改环境变量就能实时生效**。结果往往是构建时的值被「烤」进了产物里，运行时怎么改都没反应。

这个坑的隐蔽之处在于：本地开发时它「看起来是工作的」，只有到了生产构建后才会暴露，因此非常值得提前理解清楚。

## 核心内容 {#core-content}

### 一、基本作用 {#runtime-config-basic}

`runtimeConfig` 分为两部分：

| 字段                     | 可访问范围             | 典型用途                  |
|------------------------|-------------------|-----------------------|
| `runtimeConfig` 顶层     | 仅服务端（server-only） | API 密钥、私密令牌           |
| `runtimeConfig.public` | 服务端 + 客户端         | 公开的 API base URL、站点信息 |

在代码中通过 `useRuntimeConfig()` 读取：

```ts
const config = useRuntimeConfig()

// 服务端可读私密值
console.log(config.apiSecret)

// 客户端与服务端都可读公开值
console.log(config.public.apiBase)
```

### 二、常见的错误 {#most-common-mistake}

典型写法是把环境变量在配置里硬编码进 `process.env`：

```ts
// nuxt.config.ts —— 常见但有陷阱的写法
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: process.env.API_SECRET,
    public: {
      apiBase: process.env.API_BASE
    }
  }
})
```

开发者的心理预期是：「部署时我在服务器上设置 `API_BASE`，应用启动时就会读到新值。」

问题在于：**`process.env.API_BASE` 是在构建（build）阶段被求值的**。

打包完成后，这个值已经变成了一个字面量常量写死在产物中。

运行时即便你重新设置了 `API_BASE`，代码里也不会再去读 `process.env` —— 那行 `process.env.API_BASE` 早已不存在了。

### 三、为什么改了也没变化 {#why-not-change}

修改环境变量后重启应用，页面上的值纹丝不动。根本原因就是**构建期求值 vs 运行期求值**的错配：

- 构建期：`process.env.API_BASE` → 被替换成当时的具体字符串
- 运行期：应用读取的是 `runtimeConfig` 对象里那个已经固定下来的值

换句话说，你以为的「运行时配置」，实际上退化成了「构建时配置」。

### 四、用 `NUXT_` 前缀在运行时覆盖 {#correct-way}

Nuxt 提供了一套**自动的环境变量覆盖机制**：只要环境变量名遵循约定前缀，Nuxt 会在**运行时**自动用它覆盖对应的 `runtimeConfig` 键，完全不需要在 `nuxt.config.ts` 里手写 `process.env`。

**映射规则**：

- `runtimeConfig.apiSecret` ← 环境变量 `NUXT_API_SECRET`
- `runtimeConfig.public.apiBase` ← 环境变量 `NUXT_PUBLIC_API_BASE`

即：顶层键加前缀 `NUXT_`，`public` 下的键加前缀 `NUXT_PUBLIC_`，并把 camelCase 转成大写下划线（`SCREAMING_SNAKE_CASE`）。

因此 `nuxt.config.ts` 里只需要给出**默认值（甚至空字符串占位）**，声明这些键的存在即可：

```ts
// nuxt.config.ts —— 推荐写法
export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: '',            // 由 NUXT_API_SECRET 在运行时覆盖
    public: {
      apiBase: ''             // 由 NUXT_PUBLIC_API_BASE 在运行时覆盖
    }
  }
})
```

运行时（生产环境）设置环境变量：

```bash
NUXT_API_SECRET=super-secret-token
NUXT_PUBLIC_API_BASE=https://api.example.com
```

或者在 `.env` 文件中：

```dotenv
NUXT_API_SECRET=super-secret-token
NUXT_PUBLIC_API_BASE=https://api.example.com
```

> 补充说明：`nuxt.config.ts` 里 `runtimeConfig` 的键**必须先声明**，Nuxt 才会去匹配对应的 `NUXT_` 环境变量。
> 
> 一个从未在 `runtimeConfig` 中出现过的键，不会仅凭一个 `NUXT_` 环境变量凭空生成。

### 五、几种「看起来能行，其实不行」的场景 {#confusing-scenarios}

除了硬编码 `process.env` 之外，还有一些容易混淆的情况：

- **在 `.env` 里用了非 `NUXT_` 前缀的变量名**（例如自定义的 `API_BASE`），却期望它自动覆盖 `runtimeConfig`——不会生效，必须是 `NUXT_` / `NUXT_PUBLIC_` 前缀。
- **键名大小写 / 层级对不上**：`public` 下的键一定要用 `NUXT_PUBLIC_` 前缀，漏掉 `PUBLIC` 就无法命中。
- **只在开发环境验证**：dev 模式下每次都会重新读取，容易造成「一切正常」的错觉，真正的问题要到生产构建后才显现。

## 实操清单 {#practical-checklist}

1. 在 `nuxt.config.ts` 的 `runtimeConfig` 中**声明所有需要的键**，给出默认值或空字符串占位。
2. **不要**用 `process.env.XXX` 去给这些键赋值（除非你确实需要构建期固定值）。
3. 私密配置放在 `runtimeConfig` 顶层，公开配置放在 `runtimeConfig.public`。
4. 运行时通过 `NUXT_`（顶层）和 `NUXT_PUBLIC_`（public）前缀的环境变量进行覆盖。
5. 键名转换规则：camelCase → 大写下划线，例如 `apiBase` → `NUXT_PUBLIC_API_BASE`。
6. 在代码中统一用 `useRuntimeConfig()` 读取，避免直接访问 `process.env`。
7. 部署前用一次真实的生产构建验证覆盖是否生效，而不仅依赖 dev 模式。

## 注意事项 {#caution}

| 场景             | 原因                      | 正确做法                               |
|----------------|-------------------------|------------------------------------|
| 改了环境变量不生效      | `process.env` 在构建期被烤进产物 | 用 `NUXT_` / `NUXT_PUBLIC_` 运行时覆盖   |
| 自定义变量名不起作用     | 前缀不符合约定                 | 严格使用 `NUXT_` / `NUXT_PUBLIC_` 前缀   |
| public / 私密值混淆 | 层级放错                    | 私密放顶层，公开放 `public`                 |
| 只在 dev 验证通过    | dev 与生产求值时机不同           | 用生产构建复测                            |
| 键名映射错误         | camelCase 转换写错          | `apiBase` → `NUXT_PUBLIC_API_BASE` |

> `runtimeConfig.public` 里的值会被序列化进客户端 payload，**任何放进 `public` 的内容都等同于公开**，千万不要把密钥放进去；真正的私密信息只能放在 `runtimeConfig` 顶层，仅在服务端使用。

## 延伸阅读 {##further-reading}

- [12-Factor App 方法论](https://12factor.net/)
- [Nuxt 官方文档 runtimeConfig 修正 PR #24612](https://github.com/nuxt/nuxt/pull/24612)