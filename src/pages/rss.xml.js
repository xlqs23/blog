import rss from '@astrojs/rss';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { visiblePosts, localUrl, postUrl } from '../lib/posts';
export async function GET(context) {
  const posts = (await visiblePosts()).filter((post) => !post.data.draft);
  return rss({ title: SITE_TITLE, description: SITE_DESCRIPTION, site: new URL(localUrl(), context.site), items: posts.map((post) => ({ title: post.data.title, description: post.data.description, pubDate: post.data.pubDate, link: postUrl(post.id), categories: post.data.tags })), customData: '<language>zh-cn</language>' });
}
