---
title: 用 Astro 搭建静态博客的完整流程
date: 2026-09-20
description: 从零开始用 Astro 5 搭一个纯静态博客：内容集合、路由、样式与构建产物。
category: 技术
series: Astro 入门
draft: false
---

Astro 的默认输出是「零 JS 的 HTML」，这对内容站非常合适：首屏快、可被任意静态服务器托管、也不存在运行时被攻击的面。

## 1. 定义内容集合

用 `src/content.config.ts` 声明集合与 schema，Astro 会在构建期校验每一篇 frontmatter，写错字段直接构建失败，而不是等到线上才发现。

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    category: z.string().optional(),
    series: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
```

## 2. 取数据并排序

在 `.astro` 文件里用 `getCollection` 拿数据，注意过滤掉草稿：

```ts
const articles = (await getCollection('articles', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
```

## 3. 构建

```bash
pnpm install
pnpm build     # 产物在 dist/
```

`dist/` 是一堆纯静态文件，丢给 Nginx、对象存储、GitHub Pages 都能直接跑。

## 为什么不用 SSR

内容站真正的复杂度在「内容管理」，不在「运行时」。把运行时砍掉，运维成本会下降一个数量级：不用管进程、不用管连接池、不用管扩容。
