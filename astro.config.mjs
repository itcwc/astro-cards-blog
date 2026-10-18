import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// 纯静态输出：pnpm build 产出 dist/，交给任意静态服务器（Nginx / 宝塔 / 对象存储 / Pages）即可。
// ⚠️ 换成你自己的域名，它会用于 canonical URL 与 RSS 等绝对链接。
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [mdx()],
});
