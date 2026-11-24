export const categories = [
  { id: 'algorithm-contest', route: 'algo', label: '算法竞赛', description: '题解、算法笔记与竞赛记录。' },
  { id: 'technical', route: 'technical', label: '技术笔记', description: '开发实践、技术原理与工具记录。' },
  { id: 'daily-life', route: 'daily-life', label: '日常随笔', description: '阅读、生活与随手记下的想法。' },
] as const;

export const categoryIds = ['algorithm-contest', 'technical', 'daily-life'] as const;

export const archives = [
  { id: 'all', route: 'all', label: '全部文章', description: '按发布时间浏览博客文章。' },
  ...categories,
] as const;

type Metadata = { category?: typeof categoryIds[number]; tags: string[] };

export function categoryFor(data: Metadata) {
  const selected = categories.find(({ id }) => id === data.category);
  if (selected) return selected;
  const tags = data.tags.join(' ').toLowerCase();
  if (/算法|竞赛|题解|leetcode|codeforces|icpc|\balgorithm\b/.test(tags)) return categories[0];
  if (/技术|开发|工程|编程|工具|科研|研究|\b(technical|programming|python|astro)\b/.test(tags)) return categories[1];
  return categories[2];
}
