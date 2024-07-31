# Nuxt 安装

## 环境准备

- **Node.js** 需要 [Node.js](https://nodejs.org/zh-cn) >= `V18.0.0`
- **文本编辑器** - 推荐使用带有官方 Vue 扩展的 [Visual Studio Code](https://code.visualstudio.com/)
- **终端** 用于运行 Nuxt 命令
- **[npm](https://www.npmjs.com/)** 或 **[Yarn](https://yarnpkg.com/)** 安装Node依赖

## 安装步骤

### **创建新的 Nuxt 3 项目**

打开命令行，导航到你希望创建项目的目录，然后运行以下命令：

::: code-group
```bash [npm]
npx nuxi@latest init my-nuxt3-app
```

```bash [yarn]
yarn dlx nuxi@latest init my-nuxt3-app
```

```bash [pnpm]
pnpm dlx nuxi@latest init my-nuxt3-app
```

```bash [bun]
bun x nuxi@latest init <project-name>
```
:::

::: tip 温馨提示
处理使用默认的启动器，也可以打开 [nuxt.new](https://nuxt.new) 并按照说明安装其他启动器或主题。
:::

### **进入项目目录**

```bash
cd my-nuxt3-app
```

### **启动开发服务器**

::: code-group
```bash [npm]
npm run dev -- -o
```

```bash [yarn]
yarn dev --open
```

```bash [pnpm]
pnpm dev -o
```

```bash [bun]
bun run dev -o
```
:::

这将启动一个本地开发服务器，默认情况下在 `http://localhost:3000` 运行。

## 安装示例

```bash
# 创建新项目
npx nuxi init my-nuxt3-app

# 进入项目目录
cd my-nuxt3-app

# 启动开发服务器
npm run dev -- -o
```

更多详细信息和配置选项，请参阅 [Nuxt 3 官方文档](https://nuxt.com/docs)。