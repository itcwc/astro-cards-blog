// 构建期生成站内搜索索引：/search.json
// 纯静态方案，无第三方依赖。前端由 public/search.js 拉取后本地打分，
// 因此新增内容只要重新 build 就会自动进入索引，不需要维护额外服务。
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { formatDate } from '../lib/reading-time';

// 正文入索引的长度上限。文章偏长，全量入索引会让 json 体积翻倍，
// 而搜索命中通常在前几千字内，截断收益远大于损失。
const BODY_LIMIT = 4000;

// 把 markdown / MDX 压成可搜索的纯文本。
// 代码块保留正文（技术文里常搜函数名 / 命令 / 库名），只去掉 ``` 围栏标记本身。
function plainText(md: string): string {
  return md
    .replace(/^[ \t]*(```|~~~)[^\n]*$/gm, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*\|?[\s:-]+\|[\s:|-]*$/gm, ' ')
    .replace(/[*_~`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET: APIRoute = async () => {
  const [articles, notes] = await Promise.all([
    getCollection('articles', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
  ]);

  const items = [
    ...articles.map((entry) => {
      const body = plainText(entry.body ?? '');
      return {
        type: 'article' as const,
        title: entry.data.title,
        url: `/articles/${entry.id}`,
        date: formatDate(entry.data.date),
        stamp: entry.data.date.getTime(),
        meta: [entry.data.series, entry.data.category].filter(Boolean).join(' '),
        desc: entry.data.description ?? '',
        text: (entry.data.description ? entry.data.description + ' ' : '') + body.slice(0, BODY_LIMIT),
      };
    }),
    ...notes.map((entry) => {
      const body = plainText(entry.body ?? '');
      // 笔记多数没有 title，用正文开头当标题，列表里同样是这个观感
      const fallback = body.slice(0, 32) + (body.length > 32 ? '…' : '');
      return {
        type: 'note' as const,
        title: entry.data.title || fallback,
        url: `/notes/${entry.id}`,
        date: formatDate(entry.data.date),
        stamp: entry.data.date.getTime(),
        meta: entry.data.tags.join(' '),
        desc: '',
        text: body.slice(0, BODY_LIMIT),
      };
    }),
  ].sort((a, b) => b.stamp - a.stamp);

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  });
};
