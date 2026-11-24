import { categoryFor } from '../lib/categories';
import { visiblePosts } from '../lib/posts';

export async function GET() {
  const posts = await visiblePosts();
  return Response.json(posts.map(({ id, data, body }) => ({
    id,
    text: [data.title, data.description, data.tags.join(' '), categoryFor(data).label, body].join(' ').toLocaleLowerCase(),
  })));
}
