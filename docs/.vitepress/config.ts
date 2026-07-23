import { defineConfig } from 'vitepress'

export default defineConfig({
    lang: "zh-CN",
    base: "/nuxt-study/",
    title: "Nuxt 学习",
    description: "Nuxt 学习记录",
    lastUpdated: true,
    head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
    themeConfig: {
        logo: "",
        siteTitle: "Nuxt 学习",
        outline: { label: "章节导航", level: 'deep', },
        lastUpdated: { text: "最后更新时间", },
        docFooter: { prev: '上一页', next: '下一页' },
        search: {
            provider: 'local',
        },
        editLink: {
            pattern: "https://github.com/curder/nuxt-study/edit/master/docs/:path",
            text: '编辑它'
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/curder/nuxt-study' }
        ],
        nav: [
            { text: "基础", link: "/getting-started/installation", activeMatch: '/getting-started/' },
            { text: "进阶", link: "/advanced/runtime-config", activeMatch: '/advanced/' }
        ],
        sidebar: {
            "/getting-started": [
                {
                    text: "",
                    items: [
                        { text: "Nuxt 安装", link: "/getting-started/installation" },
                        { text: "创建页面", link: "/getting-started/creating-pages" },
                        { text: "链接 NuxtLink", link: "/getting-started/components/link" },
                        { text: "站点布局", link: "/getting-started/layouts" },
                        { text: "组件 Components", link: "/getting-started/components" },
                        { text: "样式 Styles", link: "/getting-started/styles" },
                        { text: "获取数据", link: "/getting-started/fetching-data" },
                        { text: "管理头部数据", link: "/getting-started/managing-head-data" },
                        { text: "Composable", link: "/getting-started/composable" },
                        { text: "服务器 api", link: "/getting-started/server-api" },
                        { text: "常用库 Libraries", link: "/getting-started/libraries" },
                        { text: "其他 Others", link: "/getting-started/others" },
                    ]
                },
            ],
            "/advanced": [
                {
                    text: "",
                    items: [
                        { text: "运行时配置 runtimeConfig", link: "/advanced/runtime-config" },
                        { text: "runtimeConfig 的误区", link: "/advanced/misconceptions-about-runtime-config"},
                        { text: "自动导入 Auto Imports", link: "/advanced/auto-import" },
                        { text: "自定义指令 v-interpolate", link: "/advanced/custom-directive-v-interpolate" },
                        { text: "客户端缓存 getCachedData", link: "/advanced/get-cached-data" },
                        { text: "服务端渲染验证", link: "/advanced/server-side-rendering-verification" },
                        { text: "window.useNuxtApp 深度解析", link: "/advanced/use-nuxt-app" },
                        { text: "Vue 3 中的 shallowRef", link: "/advanced/shallow-ref" },
                        { text: "如何精简Nuxt Payload体积", link: "/advanced/how-to-reduce-payload-size" },
                        { text: "Lazy 组件前缀", link: "/advanced/lazy-component-prefix" },
                        { text: "Vue / Nuxt 源码里的注释能删吗", link: "/advanced/can-comments-in-vue-or-nuxt-source-code-be-deleted" },
                        { text: "Nuxt 与 Nitro 的分工", link: "/advanced/nuxt-vs-nitro-what-does-what" },
                        { text: "Nuxt 中代理后端 API 的正确方式", link: "/advanced/the-best-way-to-proxy-api-in-nuxt" },
                        { text: "别再滥用 useFetch", link: "/advanced/stop-misusing-usefetch-in-nuxt" },
                        { text: "更易调试的Hydration错误与useId", link: "/advanced/vue-3-4-improved-hydration-errors-and-useid" },
                        { text: "useState 和全局状态管理", link: "/advanced/nuxt-usestate-hydration-and-global-state" },
                        { text: "组织 Composition API 代码", link: "/advanced/organize-composition-api-code" },
                        { text: "Nuxt SSR 中的类序列化", link: "/advanced/nuxt-ssr-class-serialization-payload-plugins" },
                        { text: "共享数据 sharedPrerenderData", link: "/advanced/nuxt-3-10-shared-prerender-data" },
                        { text: "Repository 模式优雅封装 API", link: "/advanced/nuxt-3-repository-pattern-custom-fetch" },
                        { text: "Nuxt 插件定义执行顺序", link: "/advanced/nuxt-plugin-object-syntax-depends-on-parallel" },
                        { text: "避免在Vue中失去响应性", link: "/advanced/avoid-losing-reactivity-in-vue" },
                        { text: "useAsyncData与useFetch对比", link: "/advanced/nuxt3-useasyncdata-vs-usefetch" },
                        { text: "让Nuxt配置感知环境", link: "/advanced/environment-aware-nuxt-configuration" },
                        { text: "在Nuxt和Nitro中集成WebSockets", link: "/advanced/integrating-websockets-in-nuxt-and-nitro" },
                        { text: "用构建缓存加速 Nuxt 打包", link: "/advanced/faster-nuxt-builds-with-build-cache" },
                        { text: "Nuxt 测试入门", link: "/advanced/nuxt-test-utils-primer" },
                        { text: "Nuxt 路径别名", link: "/advanced/nuxt-aliases-guide" },
                        { text: "异步 Composition API 的上下文丢失与四种解法", link: "/advanced/nuxt-instance-unavailable-async-composition-api" },
                        { text: "使用 unstorage 统一管理文件与 K/V", link: "/advanced/nuxt-nitro-unstorage-storage" },
                        { text: "Vue 与 Nuxt 中的动态组件", link: "/advanced/dynamic-components-in-vue-and-nuxt" },
                        { text: "用 Nuxt 构建纯客户端 SPA", link: "/advanced/build-plain-spa-with-nuxt" },
                        { text: "Options API 与 Composition API 的选择", link: "/advanced/vue-options-api-vs-composition-api" },
                        { text: "动态渲染（Dynamic Rendering）", link: "/advanced/dynamic-rendering-ssr-only-for-crawlers-nuxt" },
                        { text: "Nuxt 4 全新目录结构", link: "/advanced/nuxt-4-new-folder-structure" },
                        { text: "Nuxt 与 Nitro 的兼容性日期", link: "/advanced/nuxt-nitro-compatibility-date-explained" },
                        { text: "Nitro 缓存机制", link: "/advanced/nitro-caching-guide" },
                    ]
                },
            ]
        },
    }
});