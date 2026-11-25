import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePdfUrl } from '../src/lib/pdf-url.mjs';
import { renderMarkdownPreview } from '../src/lib/markdown-preview.mjs';
import { decryptPost } from '../src/lib/encrypted-post.mjs';
import { createEncryptedFixture } from './encryption-fixture.mjs';

test('PDF URLs preserve the blog base and reject unsafe sources', () => {
  for (const prefix of ['files/', '/files/', 'blog/files/', '/blog/files/']) {
    assert.equal(normalizePdfUrl(`${prefix}uploads/a.pdf`), '/blog/files/uploads/a.pdf');
  }
  assert.equal(normalizePdfUrl('/blog/files/uploads/a.PDF#page=2'), '/blog/files/uploads/a.PDF#page=2');
  assert.equal(normalizePdfUrl('https://example.org/paper.pdf?download=1'), 'https://example.org/paper.pdf?download=1');
  for (const url of ['javascript:alert(1).pdf', 'data:application/pdf,abc.pdf', 'blob:abc.pdf', '//example.org/a.pdf', 'http://example.org/a.pdf', 'https://user:password@example.org/a.pdf', '/files/uploads/../a.pdf', '/files/uploads/%2e%2e/a.pdf', '/files/uploads/%252e%252e/a.pdf', '/files/uploads/a%2f.pdf', '/files/uploads/a.pdf"', '/files/uploads/a.pdf\n', 'https://example.org/../a.pdf', 'https://example.org/%2e%2e/a.pdf', 'https://example.org/a.html']) {
    assert.equal(normalizePdfUrl(url), null, url);
  }
});

test('standalone PDF links become accessible cards, inline links and code stay unchanged', async () => {
  const source = '[文档 **版本一**](/files/uploads/paper.pdf)\n\n正文中的 [PDF](/files/uploads/paper.pdf) 链接。\n\n`[code](/files/uploads/code.pdf)`\n\n```md\n[code](/files/uploads/code.pdf)\n```';
  const { html } = await renderMarkdownPreview(source);
  assert.equal((html.match(/class="pdf-document"/g) || []).length, 1);
  assert.match(html, /aria-label="PDF 文档：文档 版本一"/);
  assert.match(html, /href="\/blog\/files\/uploads\/paper.pdf"/);
  assert.match(html, /download="paper.pdf"/);
  assert.match(html, /新窗口打开/);
  assert.match(html, /<p>正文中的 <a href="\/files\/uploads\/paper.pdf">PDF<\/a> 链接。<\/p>/);
  assert.match(html, /<code>\[code\]/);
  assert.doesNotMatch(html, /<iframe/);
});

test('preview removes authored embeds and never promotes unsafe links', async () => {
  const { html } = await renderMarkdownPreview('<iframe src="https://example.org/evil"></iframe>\n\n[unsafe](javascript:alert)\n\n[credential](https://u:p@example.org/a.pdf)\n\n[normal](https://example.org/a.pdf)');
  assert.doesNotMatch(html, /<iframe|href="javascript:/);
  assert.equal((html.match(/class="pdf-document"/g) || []).length, 1);
  const result = await renderMarkdownPreview('[&lt;script&gt;](/files/uploads/paper.pdf)');
  assert.match(result.html, /class="pdf-document-title">&#x3C;script><\/strong>/);
  assert.doesNotMatch(result.html, /><script>/);
});

test('protected PDF cards survive encrypted round trip without public plaintext', async () => {
  const fixture = await createEncryptedFixture();
  const { payload, encryption, password, id } = fixture;
  assert.equal(payload.assets.filter(asset => asset.mime === 'application/pdf').length, 1);
  assert.equal((payload.html.match(/class="pdf-document"/g) || []).length, 1);
  assert.doesNotMatch(JSON.stringify(encryption), /encryption-private-document.pdf|私密 PDF/);
  assert.deepEqual(await decryptPost(encryption, password, id), payload);
});
