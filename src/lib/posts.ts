import { getCollection } from 'astro:content';

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const localUrl = (path = '') => `${base}/${path.replace(/^\//, '')}`;
export const postUrl = (id: string) => localUrl(`posts/${id.split('/').map(encodeURIComponent).join('/')}/`);
export const tagUrl = (tag: string) => localUrl(`tags/${encodeURIComponent(tag)}/`);
export function mediaUrl(src: string) {
  if (/^https?:\/\//.test(src) || src.startsWith(`${base}/`)) return src;
  return localUrl(src);
}
export async function visiblePosts() {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}
