import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = path.join(root, 'src/content/blog');
const draft = path.join(fixtureDir, 'verification-private-draft.md');
const published = path.join(fixtureDir, 'verification-image.md');
const build = () => {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: root, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
};
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const read = (file) => fs.readFileSync(path.join(root, 'dist', file), 'utf8');

assert(!fs.existsSync(draft) && !fs.existsSync(published), 'Verification fixture paths must be unused');
try {
  fs.writeFileSync(draft, '---\ntitle: VERIFICATION_PRIVATE_DRAFT\npubDate: 2026-01-01\ndraft: true\ntags: [private-verification]\n---\nDRAFT_BODY_MUST_NOT_PUBLISH\n');
  fs.writeFileSync(published, '---\ntitle: VERIFICATION_IMAGE\npubDate: 2026-01-01\ndraft: false\ncategory: technical\ntags: [算法]\nheroImage: /images/probe.png\n---\n![probe](/images/probe.png)\n\nVerification body for full text search.\n');
  build();
  const output = walk(path.join(root, 'dist')).filter((f) => /\.(html|xml|js)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert(!output.includes('VERIFICATION_PRIVATE_DRAFT') && !output.includes('DRAFT_BODY_MUST_NOT_PUBLISH') && !output.includes('private-verification'), 'Draft must not leak into any public output');
  assert(!fs.existsSync(path.join(root, 'dist/posts/verification-private-draft')), 'Draft route must not be generated');
  const probe = read('posts/verification-image/index.html');
  assert.equal((probe.match(/src="\/blog\/images\/probe.png"/g) || []).length, 2, 'Cover and Markdown image both need /blog prefix');
  assert(read('technical/index.html').includes('VERIFICATION_IMAGE'), 'Explicit category must populate the correct archive');
  assert(!read('algo/index.html').includes('VERIFICATION_IMAGE'), 'An explicit category takes priority over tag inference');
  const index = JSON.parse(read('search-index.json'));
  assert(index.some((item) => item.id === 'verification-image' && item.text.includes('verification body for full text search')), 'Published bodies must be indexed');
  assert(!index.some((item) => item.id === 'verification-private-draft'), 'Private drafts must stay out of the generated search index');
} finally {
  for (const file of [draft, published]) if (fs.existsSync(file)) fs.unlinkSync(file);
}

build();
const dist = path.join(root, 'dist');
for (const file of walk(dist).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  for (const [, raw] of html.matchAll(/(?:href|src)="(\/blog\/[^"?#]*)/g)) {
    const relative = decodeURIComponent(raw.slice('/blog/'.length));
    const target = path.join(dist, relative);
    assert(fs.existsSync(target), `Broken generated local link in ${path.relative(dist, file)}: ${raw}`);
  }
}
assert(read('rss.xml').includes('https://xlqs23.github.io/blog/posts/welcome/'), 'RSS link must contain exactly one /blog prefix');
assert(read('sitemap-0.xml').includes('https://xlqs23.github.io/blog/posts/welcome/'), 'Sitemap must use production path');
assert(!read('index.html').includes('VERIFICATION_IMAGE'), 'Temporary verification content must be removed');
assert(read('index.html').includes('写作活动'), 'Homepage must render its writing calendar');
console.log('PASS: categories, search index, writing activity, draft exclusion, media paths, generated links, RSS and sitemap.');
