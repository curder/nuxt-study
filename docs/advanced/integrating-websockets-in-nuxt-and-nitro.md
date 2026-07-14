# 在Nuxt和Nitro中集成WebSockets {#integrating-websockets-in-nuxt-and-nitro}

传统的 HTTP 请求是「一问一答」的单向模型：客户端发请求，服务端回响应，连接随即结束。

但聊天室、实时通知、协同编辑、在线状态等场景需要**服务端主动推送**、且**双向持续通信**——这正是 WebSocket 的用武之地。

过去在 Nuxt 里接入 WebSocket 往往要引入额外的服务器或第三方库，配置繁琐。

Nitro 2.9（在 Vue.js Amsterdam 前夕发布）带来了内置的 WebSocket 支持，连同数据库层（database layer）和任务 API（task API）一起，让实时通信可以直接在 Nuxt/Nitro 的服务端目录里落地，无需额外服务。

需要留意的是，这一能力在当时属于**实验性（experimental）**特性，底层依赖 UnJS 生态的 [CrossWS](https://github.com/unjs/crossws)。

## 开启 WebSocket 支持 {#enable-websocket-support}

由于是实验性特性，首先要在 `nuxt.config.ts` 里显式开启 Nitro 的 experimental WebSocket 开关：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    experimental: {
      websocket: true
    }
  }
})
```

这一步是前提，不开启的话后续的 WebSocket handler 不会生效。

## 检查依赖版本 {#check-dependencies}

在动手前，先确认依赖版本是否到位，避免因版本过旧导致特性缺失：

- **Nitro** 需为 2.9 及以上（WebSocket 支持自此引入）。
- **Nuxt CLI** 建议升级到 v3.11.1 或更高——此版本后无需再依赖 nightly 通道。

版本不达标是最常见的「照着做却跑不起来」的原因，值得优先排查。

## 服务端集成：定义 WebSocket handler {#server-side-integration-define-websocket-handler}

Nitro 通过 `defineWebSocketHandler` 来定义 WebSocket 处理逻辑，文件放在 server 路由目录下（例如 `server/routes/_ws.ts` 或 `server/api/` 中带 `.ts` 的路由）。

handler 由一组**生命周期钩子（hooks）**构成：

```ts
// server/routes/_ws.ts
export default defineWebSocketHandler({
  open(peer) {
    // 有新连接建立时触发
    console.log('[ws] open', peer)
  },
  message(peer, message) {
    // 收到客户端消息时触发
    console.log('[ws] message', message.text())
    // 回发消息给该连接
    peer.send('Echo: ' + message.text())
  },
  close(peer) {
    // 连接关闭时触发
    console.log('[ws] close', peer)
  },
  error(peer, error) {
    // 发生错误时触发
    console.log('[ws] error', error)
  }
})
```

几个关键概念：

- **`peer`**：代表当前这个连接（对端），用它 `send()` 消息、或标识来源。
- **`message`**：收到的消息对象，通过 `message.text()` 取出文本内容。
- **广播**：如何把收到的消息发送给所有连接（而不仅是回给发送者），借助 `peer.publish()` 与订阅频道机制，可实现聊天室式的群发。

## 客户端集成：连接与收发消息 {#client-side-integration-connect-and-send-receive-messages}

客户端可以用原生 `WebSocket` API，但更推荐直接使用 VueUse 的 [`useWebSocket`](https://vueuse.org/core/usewebsocket) composable，它把连接管理、状态、自动重连都封装好了：

```vue
<script setup lang="ts">
import { useWebSocket } from '@vueuse/core'

// 注意使用 ws:// 协议，路径对应服务端 handler 路由
const { status, data, send, open, close } = useWebSocket('ws://localhost:3000/_ws')

function sendMessage() {
  send('Hello from client')
}
</script>

<template>
  <div>
    <p>连接状态：{{ status }}</p>
    <p>收到消息：{{ data }}</p>
    <button @click="sendMessage">发送</button>
  </div>
</template>
```

要点在于：

- **协议与路径**：URL 用 `ws://`（或生产环境的 `wss://`），路径要对应服务端定义的 handler 路由。
- **响应式状态**：`status`、`data` 都是响应式的，`data` 随服务端推送自动更新，直接绑定到模板即可实时刷新 UI。
- **`send`**：向服务端发送消息，触发服务端的 `message` 钩子。

## 在浏览器中验证 {#verify-in-browser}

启动应用后，可在浏览器开发者工具的 **Network → WS** 面板中看到 WebSocket 连接，观察帧（frames）的收发情况。

发送一条消息后，服务端回发、客户端 `data` 随之更新的完整闭环，确认连接确实是双向实时的。

## 常见案例 {#common-cases}

1. **开启开关**：在 `nuxt.config.ts` 设置 `nitro.experimental.websocket = true`。
2. **核对版本**：确保 Nitro ≥ 2.9、Nuxt CLI ≥ 3.11.1，无需 nightly。
3. **写服务端 handler**：用 `defineWebSocketHandler` 实现 `open` / `message` / `close` / `error` 钩子。
4. **接客户端**：用 VueUse 的 `useWebSocket` 连接 `ws://.../<handler 路由>`，绑定 `status` 与 `data`。
5. **验证连接**：在浏览器 Network → WS 面板查看帧收发，确认双向通信。
6. **实现广播**：服务端用 `peer.publish()` + 订阅频道，把消息群发给所有连接的客户端。

## 注意事项

| 事项                   | 说明                                                 |
|----------------------|----------------------------------------------------|
| **实验性特性**            | Nitro WebSocket 当时为 experimental，需显式开启，API 后续可能调整。 |
| **版本要求**             | Nitro ≥ 2.9、Nuxt CLI ≥ 3.11.1；版本过低是最常见的失败原因。       |
| **底层是 CrossWS**      | 跨运行时的 WebSocket 抽象由 UnJS 的 CrossWS 提供，保证多部署环境一致性。  |
| **协议要匹配**            | 本地用 `ws://`，生产（HTTPS）必须用 `wss://`，否则会被浏览器拦截。       |
| **优先用 useWebSocket** | VueUse 的封装省去手写连接管理与重连逻辑，比裸用原生 API 更省心。             |
| **广播靠 pub/sub**      | 群发需用 `peer.publish()` 配合订阅频道，而非逐个 `peer.send()`。   |

部署到 Serverless 平台时要留意——并非所有无服务器环境都支持长连接 WebSocket，某些平台需要专门的实时/边缘运行时或独立的 WebSocket 服务。

若目标平台不支持，可考虑轮询降级方案，或将 WebSocket 部署到支持持久连接的节点（如 Node 服务、支持 WS 的边缘平台）。