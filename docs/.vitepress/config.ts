import {defineConfig} from 'vitepress'

export default defineConfig({
    lang: "zh-CN",
    base: "/nuxt-study/",
    title: "Nuxt 学习",
    description: "Nuxt 学习记录",
    lastUpdated: true,
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
            // 
        ],
        sidebar: {
            "/getting-started": sidebarGettingStarted(),
        }
    }
});

function sidebarGettingStarted()
{
    return [
        //
    ];
}