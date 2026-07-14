# 动态渲染（Dynamic Rendering） {#dynamic-rendering-ssr-only-for-crawlers-nuxt}

对面向公众的 Web 应用来说，SEO（搜索引擎优化）至关重要。

而现代单页应用（SPA, Single Page Application）默认在浏览器端渲染，首屏 HTML 里几乎没有真实内容，爬虫如果不执行 JavaScript，就抓不到有效信息，直接影响收录和排名。

常见的解法是服务端渲染（SSR, Server-Side Rendering）或静态生成（SSG），让服务器先吐出带内容的 HTML。

但 SSR 会带来额外的服务器成本、水合（Hydration）复杂度和运维负担。

于是有人提出一个「省事」的折中方案：

> 既然只有爬虫需要完整 HTML，那就**只给爬虫做 SSR，普通用户照样跑纯 SPA**。

这就是**动态渲染（Dynamic Rendering）**。

它一度被 Google 官方作为过渡方案推荐，但如今争议很大。

## 一、什么是动态渲染 {#dynamic-rendering}

动态渲染的核心，是**根据请求方的身份返回不同版本的页面**：

| 请求方                 | 返回内容           | 渲染方式           |
|---------------------|----------------|----------------|
| 普通用户（浏览器）           | 空壳 HTML + JS 包 | 客户端渲染（CSR/SPA） |
| 搜索引擎爬虫（Googlebot 等） | 已渲染好的完整 HTML   | 服务端渲染（SSR）     |

判断依据通常是请求头里的 **User-Agent**：服务器维护一份爬虫标识清单，命中则走 SSR/预渲染管线，否则原样返回 SPA。

在传统实现里，这一步往往交给一个中间层来做，例如 Google 开源的 **[Rendertron](https://github.com/GoogleChrome/rendertron)**——它本质上是一个无头浏览器（Headless Chrome）服务，把 SPA 跑一遍、截取渲染后的 HTML 再回传给爬虫。

## 二、为什么有人用动态渲染 {#dynamic-rendering-why}

它的吸引力在于「用最小改动换到 SEO」：

- **主应用无需重构**：业务代码仍是熟悉的 SPA，不用处理全站 SSR 的水合、`window` 不可用、状态序列化等问题。
- **服务端压力可控**：只有爬虫流量走重量级渲染，真实用户不占用 SSR 资源。
- **兼容「跑不动 JS 的爬虫」**：部分社交平台抓取器（生成分享卡片的那种）不执行 JS，动态渲染能保证它们拿到 `<meta>` 与正文。

这套思路在早期确实是官方认可的过渡手段，尤其适合那些「已经是 SPA、又急需被收录」的历史项目。

## 三、动态渲染的劣势 {#dynamic-rendering-cons}

问题也很明显，作者把它归为「治标不治本」：

- **维护额外基础设施**：需要一套渲染服务（如 Rendertron）或缓存层，多一个会挂、会拖慢、会产生成本的环节。
- **两套输出容易漂移**：用户看到的 HTML 和爬虫看到的 HTML 是两条链路，长期演进后极易不一致，导致「排名内容 ≠ 真实内容」。
- **首屏体验没改善**：真实用户依旧是空壳 + 等 JS，动态渲染完全没解决普通访客的首屏与性能问题。
- **调试困难**：出问题时要模拟特定 User-Agent 才能复现爬虫看到的版本。
- **现代搜索引擎已能执行 JS**：Googlebot 早已基于较新的 Chromium 渲染页面，很多场景下 SPA 直接就能被抓到内容——动态渲染的必要性大幅下降。

> 补充：即便如此，社交抓取器、部分小众搜索引擎仍可能不跑 JS，这类边缘需求才是动态渲染残存的价值点。

## 四、动态渲染算不算「作弊」（Cloaking）？{#dynamic-rendering-cloaking}

这是最敏感的一点。**伪装（Cloaking）**指的是「给搜索引擎和用户看实质不同的内容」，属于 Google 明令禁止、可能被惩罚的行为，详见 [Google 官方对 Cloaking 的说明](https://developers.google.com/search/docs/essentials/spam-policies)。

区别在于**内容是否一致**：

- ✅ 合规：爬虫和用户拿到的是**同样的内容**，只是渲染方式不同（一个预渲染、一个客户端渲染）。这正是动态渲染被允许的边界。
- ❌ 违规：借机给爬虫塞关键词、给用户看另一套页面——这就是 Cloaking。

动态渲染本身不等于作弊，但它「天然把你放在了危险的边缘」，一旦两套输出失控就可能被判定为伪装。

## 五、到底该不该用？{#dynamic-rendering-should-use}

**2024 年及以后，动态渲染不应作为首选方案。** Google 自己也已把它从「推荐做法」降级为「权宜之计（workaround）」，参考 [Google 关于动态渲染的文档](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)。

更推荐的替代顺序大致是：

1. **优先真正的 SSR / SSG**：内容对用户和爬虫一致，首屏和 SEO 一并解决。
2. **按需混合渲染**：用路由级规则区分哪些页面 SSR、哪些静态、哪些纯客户端。
3. **仅在无法全站 SSR 的历史 SPA 上**，才把动态渲染当临时补丁。

## 六、用 Nuxt.js 实现动态渲染 {#nuxt-dynamic-rendering}

Nuxt 的优势是它**本身就能 SSR**，所以不需要额外的 Rendertron，只要「按请求决定这次要不要 SSR」即可：**爬虫走默认 SSR，普通用户强制降级为 SPA**。

思路是在 Nitro（Nuxt 的服务端引擎）里加一个服务器中间件，读取 `user-agent`，非爬虫请求就关闭本次 SSR。

在 `server/middleware/` 下新建一个处理器：

```ts
// server/middleware/dynamic-rendering.ts
export default defineEventHandler((event) => {
  const userAgent = getHeader(event, 'user-agent') || ''

  // 维护一份爬虫 UA 关键字清单
  const crawlers = ['googlebot', 'bingbot', 'facebookexternalhit', 'twitterbot']
  const isCrawler = crawlers.some((bot) => userAgent.toLowerCase().includes(bot))

  // 非爬虫：本次请求禁用 SSR，回退为纯 SPA
  if (!isCrawler) {
    event.context.nuxt = event.context.nuxt || {}
    event.context.nuxt.noSSR = true
  }
})
```

几个要点：

- `getHeader(event, 'user-agent')` 来自 Nitro/h3 的工具函数，用于读取请求头（视频评论区就有人专门问这个 `getHeader` 从哪来——它是服务端自动可用的辅助方法）。
- `event.context.nuxt.noSSR = true` 是关键开关：命中时 Nuxt 对这次请求跳过服务端渲染，直接返回 SPA 空壳。
- 有观众补充：第 14 行的 `event.context.nuxt = event.context.nuxt || {}` 可以用较新的空值合并赋值运算符简写：

```ts
event.context.nuxt ??= {}
event.context.nuxt.noSSR = true
```

在实现时也提到，判断逻辑越简单越好，UA 清单要能持续维护；更完整的按需 SSR 配置可参考作者的文章 [Enable SSR dynamically in Nuxt（lichter.io）](https://www.lichter.io)。

> 补充：如果你只是想「某些路由 SSR、某些不 SSR」，未必需要动态渲染，Nuxt 的路由规则（Route Rules，`routeRules`）就能声明式地区分渲染模式，比按 UA 判断更稳、更可维护。

## 常见落地步骤 {#dynamic-rendering-steps}

1. **先评估必要性**：用 Google Search Console 的「网址检查」看爬虫是否已能抓到 SPA 内容，能抓到就别上动态渲染。
2. **确认走 Nuxt 内置 SSR**，避免再引入 Rendertron 之类的外部渲染服务。
3. **维护爬虫 User-Agent 清单**（Googlebot、Bingbot、社交抓取器等）。
4. **新增服务器中间件**：读取 `user-agent`，非爬虫时设置 `event.context.nuxt.noSSR = true`。
5. **保证内容一致**：爬虫版与用户版必须是同一份内容，杜绝任何「只给爬虫加料」的行为，避免踩 Cloaking 红线。
6. **验证效果**：用不同 UA（模拟 Googlebot 与普通浏览器）分别请求，对比返回 HTML。
7. **规划退出**：把动态渲染当过渡方案，逐步迁移到真正的 SSR / 混合渲染。

## 注意事项 {#dynamic-rendering-notes}

- **动态渲染 ≠ Cloaking，但一步之遥**：只要两端内容保持一致就合规，一旦内容分叉就有被惩罚风险。
- **它不解决用户侧首屏**：普通访客体验和纯 SPA 完全一样，别指望它提升性能。
- **别忘了非 JS 抓取器**：社交分享卡片、部分聚合器不跑 JS，这类场景是动态渲染仅剩的合理用途。
- **优先考虑替代方案**：全站 SSR、SSG、Nuxt 的 `routeRules` 混合渲染，长期都比动态渲染更省心。
- **UA 清单会过期**：爬虫标识会变化，需要持续更新，否则可能漏判导致新内容不被收录。
- **善用空值合并赋值**：`event.context.nuxt ??= {}` 比 `|| {}` 更贴合意图，也更简洁。