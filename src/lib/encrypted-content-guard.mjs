import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { assertEncryptedRecord } from './encrypted-post.mjs';

export async function checkEncryptedSources(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await checkEncryptedSources(file);
    else if (/\.(md|mdx)$/i.test(entry.name)) {
      const parsed = parseFrontmatter(await fs.readFile(file, 'utf8'));
      assertEncryptedRecord(parsed.frontmatter, parsed.content, entry.name);
    }
  }
}

export function encryptedContentGuard() {
  return {
    name: 'encrypted-content-guard',
    hooks: {
      'astro:config:setup': async ({ config }) => {
        await checkEncryptedSources(fileURLToPath(new URL('src/content/blog/', config.root)));
      },
    },
  };
}
