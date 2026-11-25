import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { renderMarkdownPreview } from '../src/lib/markdown-preview.mjs';

export const fixtureId = 'verification-encrypted-private';
export const fixturePassword = 'synthetic-test-only-正确密码-2026!';
export const secretMarker = 'ENCRYPTED_PRIVATE_BODY_49b640c7';
export const secretImage = '/blog/images/uploads/encryption-private-pixel.png';
export const secretPdf = '/blog/files/uploads/encryption-private-document.pdf';

export function encryptFixturePayload(payload, id = fixtureId, password = fixturePassword) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, 600000, 32, 'sha256');
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`xlqs-blog:${id}:v1`));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  key.fill(0);
  return { version: 1, kdf: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: salt.toString('base64'), iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') };
}

export async function createEncryptedFixture() {
  const body = `## 私密标题\n\n${secretMarker}\n\n行内公式 $E=mc^2$。\n\n$$\n\\int_0^1 x^2\\,dx=\\frac{1}{3}\n$$\n\n![私密图片](${secretImage})\n\n[下载私密 PDF](${secretPdf})\n`;
  const { html } = await renderMarkdownPreview(body);
  const payload = {
    html,
    assets: [
      { url: secretImage, mime: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2qkAAAAASUVORK5CYII=' },
      { url: secretPdf, mime: 'application/pdf', data: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF').toString('base64') },
    ],
  };
  const encryption = encryptFixturePayload(payload);
  const metadata = { title: '公开标题：加密阅读验证', description: '公开摘要：合成测试文章。', pubDate: '2026-01-01', tags: ['公开标签'], category: 'technical', draft: false, encrypted: true, encryption };
  const markdown = `---\n${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n`;
  return { id: fixtureId, password: fixturePassword, metadata, payload, encryption, markdown };
}
