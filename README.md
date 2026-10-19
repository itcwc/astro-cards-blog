<div align="center">

# Cards Blog

**卡片流极简静态博客模板 · Astro 5 · 内容即文件 · 无数据库无服务端**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro](https://img.shields.io/badge/Astro-5-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()

**简体中文** | [English](README.en.md)

</div>

一个用 **Astro 5** 搭的极简博客模板：文章与笔记是仓库里的 Markdown 文件，构建产物是纯静态 HTML，可以直接丢给 Nginx、对象存储或任何静态托管平台。没有数据库、没有运行时服务、没有需要维护的后端。

带一套可选的 **Decap CMS 在线后台**（`/webadm/`），通过 GitHub OAuth 登录、保存即 commit 到仓库，适合手机上随手记。

## 截图

| 首页（文章 + 笔记混排） | 文章列表（专栏筛选 + 分页） |
| --- | --- |
| ![首页](docs/screenshots/home.png) | ![文章列表](docs/screenshots/articles.png) |

| 笔记列表（标签筛选 + 分页） | 文章详情 | 后台登录页 |
| --- | --- | --- |
| ![笔记列表](docs/screenshots/notes.png) | ![文章详情](docs/screenshots/article.png) | ![后台](docs/screenshots/webadm-login.png) |

## 特性

- **内容即文件**：`src/content/articles/*.md` 与 `src/content/notes/*.md`，git 版本化，任意编辑器可写
- **类型安全的内容模型**：Astro Content Collections + zod schema，frontmatter 写错在构建期就报错
- **卡片流版式**：首页文章/笔记按时间混排，杂志式卡片 + 分类 chip + 笔记左侧 accent 条
- **列表页筛选与分页**：专栏/标签筛选 + 客户端分页（每页 9 条），首页混排每页 12 条，均无需后端
- **系列（专栏）页**：`series` 字段自动归档到 `/columns/<系列名>`
- **草稿机制**：`draft: true` 的内容在构建期被过滤，不会出现在任何页面
- **可选在线后台**：Decap CMS + GitHub OAuth（Cloudflare Workers 自建授权端点），保存即 commit
- **主题与国际化基础**：浅色/深色主题切换，简体中文界面
- **Mermaid 流程图**：正文里语言标记为 `mermaid` 的代码块会渲染成真正的图；按需加载（不含图表的文章零开销），配色跟随深浅色主题
- **阅读时长、日期格式化、笔记相册**等细节均已内置

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 产物在 dist/
pnpm preview    # 本地预览构建产物
```

> 需要 Node 18.17+ 或 20.3+。使用 npm 也可以：`npm install && npm run dev`。

## 内容管理

### 目录

```
src/content/
├── articles/   # 长文：教程、技术笔记
└── notes/      # 短笔记：一句话、一张图、一段摘抄
```

### 文章 frontmatter

```yaml
---
title: 文章标题              # 必填
date: 2026-10-01            # 必填
description: 摘要           # 可选，用于列表与 SEO
category: 技术              # 可选
series: 快速上手            # 可选，归档到 /columns/<系列名>
draft: false                # true 则不发布
---
```

### 笔记 frontmatter

```yaml
---
date: 2026-10-01            # 必填
title: 笔记标题             # 可选，留空时列表显示正文摘要
tags: [Astro, 技巧]         # 可选
images:                     # 可选，相册
  - /uploads/xxx.jpg
draft: false
---
```

## 站点配置

站点名、标语、GitHub 链接等写在 **`src/site-config.json`**：

```json
{
  "siteName": "Cards Blog",
  "tagline": "卡片流 · 静态优先 · 内容即文件",
  "logo": "",
  "icon": "/favicon.svg",
  "github": "https://github.com/your-name/your-repo",
  "footerText": ""
}
```

改完重新构建即可生效。需要改域名时，同时更新 `astro.config.mjs` 里的 `site`。

## 在线后台（可选）

后台位于 **`/webadm/`**，基于 [Decap CMS](https://decapcms.org/)，用 GitHub 账号授权后直接把 Markdown 提交到仓库，无需任何自建后端服务。

授权需要一次性的配置（3 步），详细说明都写在
[`public/webadm/config.yml`](public/webadm/config.yml) 的注释里：

1. **部署 OAuth 客户端**：在 Cloudflare Workers 上跑
   [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)（单文件、零依赖）
2. **GitHub OAuth App**：Authorization callback URL 填 `<你的 Worker 地址>/callback`
3. **改 `public/webadm/config.yml`**：替换 `repo` / `base_url` / `site_domain` 三处

> ⚠️ 不要把 `base_url` 写成 `https://github.com`。GitHub 目前不支持浏览器端 SPA 的 PKCE
> 授权，`github` 后端必须经由 OAuth 客户端转发，直连会因为参数不被识别而 404。

## 部署

### 任意静态托管

`pnpm build` 后把 `dist/` 上传即可，适配 Nginx、宝塔、对象存储、Vercel、Netlify、Cloudflare Pages 等。

### 自托管 + 自动部署（可选）

仓库附带 [`deploy.sh`](deploy.sh)，配合 Git WebHook 实现「push 即上线」：
快进拉取 → 安装依赖 → 构建 → 失败自动回滚。用法见脚本顶部注释。

## 目录结构

```
.
├── astro.config.mjs          # Astro 配置（静态输出）
├── deploy.sh                 # 自托管自动部署脚本（可选）
├── public/
│   ├── favicon.svg
│   ├── uploads/              # 后台上传的图片
│   └── webadm/               # Decap CMS 后台入口
├── src/
│   ├── components/           # 卡片、头部、页脚等
│   ├── content/              # ← 你的文章与笔记
│   ├── content.config.ts     # 内容集合 schema
│   ├── layouts/
│   ├── lib/                  # 站点配置、阅读时长等
│   ├── pages/                # 路由：首页 / 文章 / 笔记 / 专栏
│   ├── site-config.json      # ← 站点名、标语、GitHub 链接
│   └── styles/global.css
└── tsconfig.json
```

## License

[MIT](LICENSE)
