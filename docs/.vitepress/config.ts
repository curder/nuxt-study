import {defineConfig} from 'vitepress'

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
        outline: {
            label: "章节导航",
            level: 'deep',
        },
        lastUpdated: {
            text: "最后更新时间",
        },
        docFooter: {
            prev: '上一页',
            next: '下一页'
        },
        editLink: {
            pattern: "https://github.com/curder/nuxt-study/edit/master/docs/:path",
            text: '编辑它'
        },
        socialLinks: [
            {icon: 'github', link: 'https://github.com/curder/nuxt-study'}
        ],
        nav: [
            {text: "基础入门", link: "/getting-started/installation", activeMatch: '/getting-started/'},
        ],
        sidebar: {
            "/getting-started":  [
                {
                    text: "",
                    items: [
                        {text: "Nuxt 安装", link: "/getting-started/installation"},
                        {text: "创建页面", link: "/getting-started/creating-pages"},
                        {text: "链接 NuxtLink", link: "/getting-started/components/link"},
                        {text: "站点布局", link: "/getting-started/layouts"},
                        {text: "组件 Components", link: "/getting-started/components"},
                        {text: "样式 Styles", link: "/getting-started/styles"},
                        {text: "获取数据", link: "/getting-started/fetching-data"},
                        {text: "管理头部数据", link: "/getting-started/managing-head-data"},
                        {text: "Composable", link: "/getting-started/composable"},
                    ]
                },
            ],
        }
    }
});