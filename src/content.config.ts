import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 文章：长教程 / 技术文
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

// 笔记：短知识卡 / 摘记
const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string().optional(),
    tags: z.array(z.string()).default([]),
    images: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles, notes };
