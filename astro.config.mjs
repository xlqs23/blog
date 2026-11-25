import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import { mathRemarkPlugins, rehypeBlogMath } from './src/lib/markdown-math.mjs';
import { encryptedContentGuard } from './src/lib/encrypted-content-guard.mjs';

function prefixImages() {
  return (tree) => {
    const visit = (node) => {
      if (node.tagName === 'img' && typeof node.properties?.src === 'string') {
        const src = node.properties.src;
        if (src.startsWith('/images/')) node.properties.src = `/blog${src}`;
        else if (src.startsWith('images/')) node.properties.src = `/blog/${src}`;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

export default defineConfig({
  site: process.env.SITE_URL || 'https://xlqs23.github.io',
  base: '/blog',
  trailingSlash: 'always',
  output: 'static',
  integrations: [encryptedContentGuard(), mdx(), sitemap()],
  markdown: {
    syntaxHighlight: { type: 'shiki', excludeLangs: ['math'] },
    processor: unified({ remarkPlugins: mathRemarkPlugins, rehypePlugins: [prefixImages, rehypeBlogMath] }),
  },
  server: { host: '127.0.0.1', port: 4321 },
});
