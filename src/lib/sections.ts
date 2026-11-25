import { z } from 'astro/zod';
import content from '../data/sections.json';

// Allow ordinary web addresses and site-relative paths, but no executable schemes.
function safeUrl(value: string) {
  if (!value) return true;
  if (/[\u0000-\u0020\u007f<>"'`\\]/.test(value)) return false;
  try {
    if (/^\/(?!\/)/.test(value)) {
      const pathname = decodeURIComponent(value.split(/[?#]/, 1)[0]);
      return !pathname.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(pathname) && !pathname.split('/').includes('..');
    }
    if (!/^https?:\/\//i.test(value)) return false;
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

const optionalUrl = z.string().trim().max(2048).refine(safeUrl, '请使用 http(s) 地址或以 / 开头的站内路径').default('');
const entry = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(240),
  description: z.string().trim().max(5000).default(''),
  url: optionalUrl,
  image: optionalUrl,
});
export type SectionEntry = z.infer<typeof entry>;
export const sections = z.object({
  links: z.array(entry).max(100),
  academic: z.array(entry).max(100),
  projects: z.array(entry).max(100),
}).parse(content);
