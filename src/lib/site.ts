// 站点公共配置：构建期从 src/site-config.json 读取（node:fs 在 Node 构建环境读取真实文件，
// 不会被 SSR 打包器当作模块解析，规避 cloudflare 适配器 SSR 构建不支持 JSON 导入的问题）。
// 后台「设置」保存会改写该文件并触发重建，下次构建即生效。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fallback: Record<string, any> = {
  siteName: 'Cards Blog',
  tagline: '卡片流 · 静态优先 · 内容即文件',
  logo: '',
  icon: '/favicon.svg',
  github: '',
  footerText: '',
};

let parsed: Record<string, any> = fallback;
try {
  const p = fileURLToPath(new URL('./site-config.json', import.meta.url));
  parsed = JSON.parse(readFileSync(p, 'utf8'));
} catch {
  parsed = fallback;
}

export const siteConfig = {
  siteName: parsed.siteName ?? fallback.siteName,
  tagline: parsed.tagline ?? '',
  logo: parsed.logo ?? '',
  icon: parsed.icon ?? '/favicon.svg',
  github: parsed.github ?? '',
  footerText: parsed.footerText ?? '',
};

export type SiteConfig = typeof siteConfig;

export default siteConfig;
