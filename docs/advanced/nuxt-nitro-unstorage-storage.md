# 使用 unstorage 统一管理文件与 K/V {#nuxt-nitro-unstorage-storage}


服务端应用经常需要保存临时数据：缓存接口结果、写入文件、记录带过期时间的对象，或在内存、文件系统、Redis 之间切换后端。

如果直接调用各个存储的原生 SDK，业务代码就会和具体实现强耦合，开发时用内存、生产时换 Redis，往往意味着要重写读写逻辑。

Nitro 提供的 `useStorage` 组合式函数（composable）给出了一层统一的键值存储（Key-Value Storage）抽象，其底层能力来自独立包 [**unstorage**](https://github.com/unjs/unstorage)。

上层只调用 `getItem`、`setItem` 等通用方法，数据最终存在哪里由存储驱动（driver）和配置决定。

## `useStorage`：读写 K/V 数据 {#use-storage-read-write-kv-data}

`useStorage` 是 Nitro 的服务端组合式函数，用于访问已配置或挂载的存储：

```ts
const storage = useStorage()

await storage.setItem('my-key', value)
const value = await storage.getItem('my-key')
```

在 `server/api/storage.ts` 中创建一个最小事件处理器（event handler）：

```ts
export default defineEventHandler(async () => {
  const storage = useStorage()

  const possibleItem = await storage.getItem<string>('my-key')
  if (possibleItem) {
    return possibleItem
  }

  const now = new Date().toISOString()
  await storage.setItem('my-key', now)
  return now
})
```

访问 `/api/storage`：首次请求生成时间并写入，之后再请求直接返回已有值。

默认情况下数据保存在内存（memory）中，服务器重启或热重载后即丢失，因此适合演示和临时缓存，不适合必须持久化的数据。

存储中的值会被序列化（serialize），`getItem` 可用泛型声明预期类型：

```ts
const possibleItem = await storage.getItem<string>('my-key')
```

## 存储结构化数据并实现过期刷新 {#storage-structured-data-and-expiration-refresh}

只存一个字符串无法判断数据何时生成，也就无法可靠地做缓存过期。

更实用的方式是保存带元数据的对象，比如写入时携带时间戳：

```ts
type SaveData = {
    createdAt: string
    data: {
        message: string
    }
}

export default defineEventHandler(async (event) => {
    const storage = useStorage();

    const possibleItem = await storage.getItem<SaveData>('my-key')
    if (possibleItem) {
        return possibleItem
    }

    const now = new Date()

    const data: SaveData = {
        createdAt: now.toISOString(),
        data: {
            message: 'Testing this useStorage now',
        },
    }

    await storage.setItem('my-key', data)

    return data
})
```

假设缓存有效期 10 秒，用毫秒时间戳比较，判断“是否仍然有效”：

```ts
type SaveData = {
  createdAt: string
  data: { message: string }
}

const CACHE_TTL = 10 * 1000
const STORAGE_KEY = 'my-extra-key'

export default defineEventHandler(async () => {
  const storage = useStorage()
  const now = new Date()

  const possibleItem = await storage.getItem<SaveData>(STORAGE_KEY)

  if (possibleItem) {
    const createdAt = new Date(possibleItem.createdAt).getTime()
    const isValid = createdAt > now.getTime() - CACHE_TTL
    if (isValid) {
      return possibleItem
    }
  }

  const data: SaveData = {
    createdAt: now.toISOString(),
    data: { message: 'Testing this useStorage now' },
  }
  await storage.setItem(STORAGE_KEY, data)
  return data
})
```

10 秒内重复访问返回相同的 `createdAt`，超过 10 秒后返回新数据。

> 有效性判断很容易写反。缓存有效的条件是 `createdAt > now - TTL`；
> 
> 若改用 `isExpired` 语义，则条件相反为 `createdAt <= now - TTL`。
> 
> 变量名要与判断逻辑保持一致。

需要注意的是，Nitro 本身已内置缓存能力。

上面的手写实现更适合学习原理，或用于需要自定义存储结构与失效规则的场景；普通的函数结果缓存应优先评估框架自带方案。

## 集中管理 key 与读写函数 {#centralized-management-of-key-and-read-write-functions}

演示为了方便直接在处理器里写 key 和读写，项目变大后建议把 key、类型和访问函数抽到服务端工具模块，降低拼写错误风险：

```ts
type SaveData = {
  createdAt: string
  data: { message: string }
}

const STORAGE_KEY = 'my-extra-key'

export async function getSavedData() {
  return await useStorage().getItem<SaveData>(STORAGE_KEY)
}

export async function setSavedData(data: SaveData) {
  return await useStorage().setItem(STORAGE_KEY, data)
}
```

这样 key 只定义一次、类型统一维护，调用方无需重复编写泛型和底层操作。


### 为什么要抽离 {#why-extract-three-specific-pain-points}

先看反面写法。假设两个接口都要读写同一份缓存数据：

```ts
// server/api/report-a.ts
const data = await useStorage().getItem<SaveData>('my-extra-key')

// server/api/report-b.ts
await useStorage().setItem('my-exrta-key', data) // 拼错了 key
```

这段代码存在三个典型问题：

| 问题    | 表现                  | 后果             |
|-------|---------------------|----------------|
| 魔法字符串 | key 以裸字符串散落各处       | 拼错不会报错，缓存静默失效  |
| 类型重复  | 每处都要手写 `<SaveData>` | 类型改动要改多处，容易遗漏  |
| 逻辑重复  | 读写逻辑各写一遍            | 无法统一加校验、日志、默认值 |

抽离的核心目标，就是让 **key 定义一次、类型维护一处、读写行为收敛到一个入口**。

### 1. 将 key 提取为常量 {#extract-key-as-constant}

最小改进是先消灭裸字符串，把 key 提到一个明确命名的常量：

```ts
// server/utils/storage-keys.ts
export const SAVE_DATA_KEY = 'my-extra-key'
```

这样所有引用都指向同一个符号，拼错时 TypeScript 会直接在编译期报错，而不是等到运行时缓存莫名失效。

如果 key 较多，可以集中成一个只读对象，便于统一查看与管理：

```ts
// server/utils/storage-keys.ts
export const StorageKeys = {
  saveData: 'my-extra-key',
  report: 'report',
  userProfile: 'user:profile',
} as const

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys]
```

`as const` 让每个值成为字面量类型，配合 `StorageKey` 就能在函数签名里约束"只能传已登记的 key"。

### 2. 把类型集中定义 {#centralize-type-definition}

数据结构也应该只写一次，供读写两端共享：

```ts
// server/utils/storage-types.ts
export type SaveData = {
  createdAt: string
  data: {
    message: string
  }
}
```

之后读取时不再需要在每个处理器里重复 `getItem<SaveData>`，而是由工具函数内部固定好类型。

### 3. 封装 Getter / Setter {#encapsulate-getter-setter}

**这是抽离的重点。** 把针对某份数据的读写包成一对语义明确的函数，调用方完全不接触 key 和底层存储：

```ts
// server/utils/save-data.ts
import { StorageKeys } from './storage-keys'
import type { SaveData } from './storage-types'

export async function getSaveData() {
  return await useStorage().getItem<SaveData>(StorageKeys.saveData)
}

export async function setSaveData(data: SaveData) {
  return await useStorage().setItem(StorageKeys.saveData, data)
}
```

在 Nuxt 的服务端目录里，`server/utils` 下的函数支持自动导入（auto-import），因此事件处理器可以直接调用，无需写 import：

```ts
// server/api/storage.ts
export default defineEventHandler(async () => {
  const existing = await getSaveData()
  if (existing) {
    return existing
  }

  const data: SaveData = {
    createdAt: new Date().toISOString(),
    data: { message: 'Testing this useStorage now' },
  }
  await setSaveData(data)
  return data
})
```

对比之前散落的写法，这里的处理器已经读不到任何 key 字符串或泛型细节，只表达业务意图。

### 4. 把过期逻辑也收进工具模块 {#converge-expiration-logic-into-utils}

既然读写已经集中，带 TTL 的缓存判断也应该一并收敛进来，而不是让每个接口各自比较时间戳。这样"什么算过期"只有一处定义：

```ts
// server/utils/save-data.ts
import { StorageKeys } from './storage-keys'
import type { SaveData } from './storage-types'

const CACHE_TTL = 10 * 1000

export async function getValidSaveData() {
  const item = await useStorage().getItem<SaveData>(StorageKeys.saveData)
  if (!item) {
    return null
  }

  const createdAt = new Date(item.createdAt).getTime()
  const isValid = createdAt > Date.now() - CACHE_TTL
  return isValid ? item : null
}

export async function setSaveData(data: SaveData) {
  return await useStorage().setItem(StorageKeys.saveData, data)
}
```

处理器随之进一步简化，只剩"取有效值，没有就重建"的主干逻辑：

```ts
// server/api/storage.ts
export default defineEventHandler(async () => {
  const cached = await getValidSaveData()
  if (cached) {
    return cached
  }

  const data: SaveData = {
    createdAt: new Date().toISOString(),
    data: { message: 'Testing this useStorage now' },
  }
  await setSaveData(data)
  return data
})
```

### 5. 进阶：泛化成可复用的工厂 {#generalize-into-reusable-factory}

如果项目里有多份结构不同的缓存数据，可以再抽象一层工厂函数（factory），一次生成一组带类型和 key 的读写方法，避免为每份数据都手写 Getter/Setter：

```ts
// server/utils/create-storage.ts
export function createTypedStorage<T>(key: string, opts?: { namespace?: string }) {
  const storage = useStorage(opts?.namespace)

  return {
    get: () => storage.getItem<T>(key),
    set: (value: T) => storage.setItem(key, value),
    remove: () => storage.removeItem(key),
  }
}
```

使用时一行即可声明一份强类型存储：

```ts
// server/utils/save-data.ts
import type { SaveData } from './storage-types'

export const saveDataStore = createTypedStorage<SaveData>('my-extra-key')

// 调用
const item = await saveDataStore.get()
await saveDataStore.set({ createdAt: new Date().toISOString(), data: { message: 'hi' } })
```

工厂的 `namespace` 参数还能顺带对接命名存储（如 `useStorage('foobar')` 或 `useStorage('server:assets')`），让不同后端也共享同一套类型安全的读写接口。

### 6. 推荐的目录结构 {#recommended-directory-structure}

把上面几类文件分门别类放好，日后回看和检索都更清晰：

```text
server/
├── utils/
│   ├── storage-keys.ts     # 所有 key 常量，唯一来源
│   ├── storage-types.ts    # 存储数据的类型定义
│   ├── create-storage.ts   # 可选：类型安全的工厂
│   └── save-data.ts        # 具体某份数据的 get/set/过期逻辑
└── api/
    └── storage.ts          # 只写业务意图，不碰 key 与底层存储
```

## 用 `server:assets` 读写服务端文件 {#use-server-assets-read-write-files}

除普通 K/V 外，还能通过命名空间访问服务端资源存储（server assets）。

通过它读写的内容会成为服务端 Bundle 的一部分，随应用一起部署。

在 `server/api/file.ts` 中：

```ts
export default defineEventHandler(async () => {
  const storage = useStorage('server:assets')
  await storage.setItem('my-file.txt', 'This is the test content')
})
```

触发 `/api/file` 后，对应内容会出现在服务端资源目录中。

unstorage 的 key 还能表达层级，例如 `txt:my-file.txt` 会被文件系统驱动映射成 `txt/my-file.txt` 这样的子目录结构。

只要驱动支持，图片、Blob 等二进制内容同样可以保存。

## unstorage：统一抽象与驱动列表 {#unstorage-unified-abstraction-and-driver-list}

unstorage 是 Nitro 存储能力的底层，为多种后端提供相似接口：

```ts
hasItem()
getItem()
setItem()
removeItem()
clear()
```

因此上层业务代码保持稳定，切换后端主要靠更换驱动。常见方向如下：

| 存储类型              | 适合场景         | 特点                                    |
|-------------------|--------------|---------------------------------------|
| Memory            | 开发、测试、短期缓存   | 快，但进程退出即丢失                            |
| File System（`fs`） | 本地持久化、简单文件存储 | 易调试，依赖可写磁盘                            |
| Redis             | 分布式缓存、跨实例共享  | 适合多实例部署                               |
| Browser Storage   | 浏览器端临时数据     | 可接入 `localStorage` / `sessionStorage` |
| MongoDB           | 基于数据库保存 K/V  | 通过驱动统一访问                              |
| HTTP              | 远程存储服务       | 通过 HTTP 调用                            |
| Git Repository    | 以仓库作为数据来源    | 特定场景可用                                |

当内置驱动无法满足需求时，还可以编写自定义驱动。

一个典型组合思路：用文件系统持久化，同时在内存里维护容量有限（如限制 1000 条）的最近最少使用缓存（Least Recently Used，LRU），命中内存直接返回、未命中回退到文件系统，从而兼顾速度与持久化。

## 声明命名存储与区分开发/生产环境 {#declare-named-storage-and-distinguish-dev-prod-environments}

调用 `useStorage('foobar')` 时，Nitro 必须知道 `foobar` 对应什么驱动。在 Nuxt 配置中声明：

```ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      foobar: {
        driver: 'fs',
      },
    },
  },
})
```

远程驱动还可配置 `base`、`host`、`password` 等连接参数。生产用 Redis 而本地不想装 Redis 时，可用 `devStorage` 为开发模式提供替代驱动，业务代码始终调用 `useStorage('foobar')` 不变：

```ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      foobar: { driver: 'redis' },
    },
    devStorage: {
      foobar: { driver: 'fs' },
    },
  },
})
```

若连接信息需要从运行时配置（runtimeConfig）动态读取，可在 Nitro 插件中创建并挂载驱动。新建 `server/plugins/storage.ts`：

```ts
import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const storage = useStorage()

  const myRedisDriver = redisDriver({
    base: 'my-base',
    host: runtimeConfig.redis.host,
  })

  storage.mount('foobar', myRedisDriver)
})
```

配套的运行时配置：

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    redis: {
      host: '',
    },
  },
})
```

`runtimeConfig.redis.host` 会映射到对应环境变量（如 `NUXT_REDIS_HOST`），密码等敏感信息应通过环境变量注入，而非写死在源码。

`redisDriver` 是少数需要手动 import 的驱动之一。这种插件挂载方式在后续版本可能被更简洁的配置取代。

## 常见案例 {#common-cases-five-steps-to-implement-storage-and-cache}

1. 在 `server/api` 下创建事件处理器，用 `useStorage()` 获取默认存储，通过常量定义 key，再用 `getItem<T>()` / `setItem()` 读写。
2. 需要过期控制时，为数据加 `createdAt` 元数据，统一用毫秒时间戳比较 `createdAt > now - TTL`。
3. 需要服务端文件时，用 `useStorage('server:assets')`，key 可带 `txt:` 前缀表达子目录。
4. 在 `nuxt.config.ts` 的 `nitro.storage` 声明生产存储，在 `devStorage` 配置开发替代驱动。
5. 连接信息动态注入时，通过 `runtimeConfig` 读取，并在 Nitro 插件中用 `storage.mount('foobar', driver)` 挂载。

一个把过期缓存与命名存储结合的示例：

```ts
const STORAGE_KEY = 'report'
const CACHE_TTL = 60 * 1000

export default defineEventHandler(async () => {
  const storage = useStorage('foobar')
  const now = Date.now()

  const cached = await storage.getItem<{ createdAt: number; report: unknown }>(STORAGE_KEY)
  if (cached && cached.createdAt > now - CACHE_TTL) {
    return cached.report
  }

  const report = await buildExpensiveReport()
  await storage.setItem(STORAGE_KEY, { createdAt: now, report })
  return report
})
```

## 注意事项 {#precautions}

- **默认内存存储不持久**：重启、热重载或重新部署后数据会全部丢失，不要用它保存关键业务数据。
- **`server:assets` 不是任意运行时磁盘**：它与构建产物相关，部署到无服务器或只读文件系统时，运行时写入行为可能与本地不同；需要运行时持久化应选明确支持写入的后端。
- **泛型不是运行时验证**：`getItem<SaveData>()` 只做编译期约束，来自旧版本或不可信来源的数据仍需运行时结构检查。
- **key 要统一管理**：分散的 `'my-extra-key'` 字符串一旦拼错就会导致缓存永远未命中。
- **切换驱动前确认后端语义**：统一 API 无法消除后端差异，是否持久化、是否支持多实例共享、能否列举/删除 key、是否支持二进制、网络中断如何处理、是否需要显式 TTL，都要逐项验证。
- **密钥不要进源码**：Redis 密码、云服务密钥应通过环境变量与 `runtimeConfig` 注入。
- **手写缓存要防击穿**：大量请求同时发现缓存过期时，可能同时执行昂贵计算或访问上游，需考虑请求合并、分布式锁、过期时间抖动或改用 Nitro 内置缓存。