---
title: 欢迎使用 Cards Blog
date: 2026-10-01
description: 一个卡片流静态博客模板的开箱说明：内容怎么放、后台怎么用、站点怎么配。
category: 随笔
series: 快速上手
draft: false
---

这是一个基于 **Astro 5** 的极简静态博客模板。没有数据库、没有后台服务，所有内容就是仓库里的 Markdown 文件。

## 内容放哪

```
src/content/articles/   # 长文：教程、技术笔记
src/content/notes/      # 短笔记：一句话、一张图、一段摘抄
```

两类内容的 frontmatter 略有区别：文章必须有 `title`，笔记的 `title` 是可选的（留空时就显示正文摘要）。

```yaml
---
title: 文章标题
date: 2026-10-01
description: 可选，用于列表页与 SEO 描述
category: 技术          # 可选
series: 快速上手        # 可选，会归档到 /columns/<系列名>
draft: false            # true 则不发布
---
```

## 怎么改站点信息

站点名、tagline、GitHub 链接都写在 `src/site-config.json`，改完重新构建即可生效：

```json
{
  "siteName": "Cards Blog",
  "tagline": "卡片流 · 静态优先 · 内容即文件",
  "github": "https://github.com/your-name/your-repo"
}
```

## 用后台写

访问 `/webadm/` 可以用 Decap CMS 在线编辑，保存即直接 commit 到仓库。首次使用需要配置 GitHub OAuth，详见 README 的「后台配置」一节。
