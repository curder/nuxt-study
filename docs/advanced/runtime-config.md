---
title: Nuxt 3 runtimeConfig 全场景实战
source: https://www.youtube.com/watch?v=2tKOZc3Z1dk&list=PL06MUQt-_wlsRNxmbIvgVuhsXG_dN1XaO&index=1
author: Alexander Lichter
date: 2026-06-27
tags: [Nuxt3, Configuration, Runtime]
---

# 运行时配置 `runtimeConfig` 真的安全吗? {#runtime-config}

> 拆解 Nuxt 3 `runtimeConfig` 的安全边界，掌握如何优雅地管理 API 密钥，确保敏感数据永远不会误入用户的浏览器控制台。

## **一、理解 `runtimeConfig`** {#understanding-runtime-config}

想象现在入住了一家五星级酒店。`runtimeConfig` 就像是房间里的**服务设施配置系统**：

- **`public` 属性**：就像是房间里的**开放吧台**。吧台上的矿泉水、咖啡包是直接摆出来的，任何进入房间的客人（前端用户）都能一眼看到并直接拿取。这适合放置一些公开的配置，比如公共 API 的地址。
- **非 `public` 属性**：就像是房间墙壁里的**隐藏保险箱**。它确实存在于你的房间里，但只有酒店的客房经理（服务端 Nitro）持有钥匙才能打开。客人即便翻遍整个房间，也无法从外部窥探保险箱里的珠宝（私钥）。

如果把银行卡密码（私密 API Key）随手丢在吧台上而不是锁进保险箱，那它就不再安全了。

## 二、方案深度对比 {#solution-comparison}

| 特性         | **方案 A：public 运行配置**                          | **方案 B：服务端私有配置**                       |
| :----------- | :--------------------------------------------------- | :----------------------------------------------- |
| **核心优势** | 前后端均可直接访问，调用逻辑简单，响应极快。         | 密钥严格隔离在服务器内存中，具备极高的安全性。   |
| **潜在劣势** | 任何用户通过开发者工具查看 `__NUXT__` 负载即可获取。 | 必须通过 Server API 中转调用，增加了少许开发量。 |
| **推荐场景** | 公共 API Key（如 Firebase、Stripe 公钥）、基础 URL。 | 数据库连接串、支付私钥、第三方服务 Secret。      |

## 三、代码演示 {#code-demonstration}

为了展示 `runtimeConfig` 在 Nuxt 3 全栈场景下的应用，以下代码涵盖了从配置文件定义到前端组件、Composable 以及服务端接口的完整链路。

### 1. 基础配置定义 {#base-config-definition}

这是所有配置的源头，通过 `public` 字段划分安全边界。

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 🔒 仅服务端可见 (Private)
    // 建议通过环境变量 NUXT_API_SECRET 覆盖
    apiSecret: "",

    // 🌍 前后端均可见 (Public)
    public: {
      apiBase: "https://api.example.com",
      publicKey: "pk_test_123456789",
    },
  },
});
```

### 2. 在 Composable 中封装公共配置 {#composable-usage}

在自定义 Composable 中使用公共配置，为全局提供统一的请求逻辑。

```typescript
// composables/useApi.ts
export const useApiFetch = (url: string, options = {}) => {
  const config = useRuntimeConfig();

  // 访问 public 字段下的配置
  return useFetch(url, {
    baseURL: config.public.apiBase,
    headers: {
      "X-Public-Key": config.public.publicKey,
    },
    ...options,
  });
};
```

### 3. 在 Vue 组件中使用 {#vue-component-usage}

在组件中直接解构 `public` 配置，用于前端逻辑判断或显示。

```vue
// components/UserProfile.vue
<script setup lang="ts">
const config = useRuntimeConfig();

// ❌ 错误做法：console.log(config) 会在 SSR 期间打印出所有配置（包括私有的）
// ✅ 正确做法：只解构需要的 public 属性
const { apiBase, publicKey } = config.public;

const { data, pending } = await useApiFetch("/user/profile");
</script>

<template>
  <div>
    <p>当前 API 端点: {{ apiBase }}</p>
    <div v-if="!pending">{{ data }}</div>
  </div>
</template>
```

### 4. 在服务端接口中使用私密配置 {#server-api-usage}

这是处理敏感数据的唯一安全场所，直接访问 `runtimeConfig` 的根属性。

```typescript
// server/api/payment.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // 读取请求体
  const body = await readBody(event);

  // 🛡️ 安全地使用私钥调用第三方支付网关
  const response = await $fetch("https://api.stripe.com/v1/charges", {
    method: "POST",
    headers: {
      // 只有服务端能拿到 config.apiSecret
      Authorization: `Bearer ${config.apiSecret}`,
    },
    body: {
      amount: body.amount,
      currency: "usd",
      source: config.public.publicKey, // 也可以访问 public 属性
    },
  });

  return response;
});
```

## 四、实践建议 {#practical-tips}

### 1. 避坑点 {#pitfalls}

**环境变量的优先级陷阱。**

在 Nuxt 3 的环境变量覆盖规则：`NUXT_PUBLIC_API_BASE` 会覆盖 `runtimeConfig.public.apiBase`。

如果你在本地 `.env` 中写错了变量名（比如漏了 `PUBLIC`），配置将无法正确注入到前端，导致请求 404 或失效。

### 2. 进阶技巧 {#advanced-tips}

**类型提示增强。**

为了获得完美的开发体验，可以通过 TypeScript 接口扩展来为 `runtimeConfig` 提供类型支持，避免在代码中出现 `any` 或拼写错误。

```typescript {2-12}
// types/runtime-config.d.ts
import type { RuntimeConfig } from "nuxt/schema";

declare module "nuxt/schema" {
  interface RuntimeConfig {
    apiSecret: string;
    public: {
      apiBase: string;
      publicKey: string;
    };
  }
}

export default defineNuxtConfig({
  runtimeConfig: {
    apiSecret: "", // 私有配置，自动从 NUXT_API_SECRET 环境变量覆盖
    // 公开配置，前后端均可访问
    public: {
      apiBase: "https://api.example.com", // 自动从 NUXT_PUBLIC_API_BASE 环境变量覆盖
      publicKey: "pk_test_123456789", // 自动从 NUXT_PUBLIC_PUBLIC_KEY 环境变量覆盖
    },
  },
});
```

### 3. 安全准则 {#security-guidelines}

永远假设 `public` 下的所有内容都是公开的。

如果一个配置项泄露会导致经济损失或数据风险，请务必将其放在 `public` 之外，并仅通过 `server/` 目录下的接口进行调用。
