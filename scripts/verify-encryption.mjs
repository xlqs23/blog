import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertEncryptedRecord, decryptPost, validateEnvelope, validatePayload } from '../src/lib/encrypted-post.mjs';
import { createEncryptedFixture, encryptFixturePayload, secretMarker, secretImage, secretPdf } from './encryption-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = await createEncryptedFixture();
const file = path.join(root, 'src/content/blog', `${fixture.id}.md`);
const build = () => spawnSync(process.execPath, [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: root, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, encoding: 'utf8' });
const requireBuild = () => { const result = build(); assert.equal(result.status, 0, result.stdout + result.stderr); };
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const read = (name) => fs.readFileSync(path.join(root, 'dist', name), 'utf8');

const decrypted = await decryptPost(fixture.encryption, fixture.password, fixture.id);
assert.deepEqual(decrypted, fixture.payload, 'Node AES-GCM/PBKDF2 output must decrypt using browser WebCrypto code');
assert(decrypted.html.includes('katex'), 'Encrypted payload must retain rendered KaTeX');
await assert.rejects(decryptPost(fixture.encryption, 'wrong synthetic password', fixture.id));
await assert.rejects(decryptPost(fixture.encryption, fixture.password, 'different-post-id'));
const tampered = Buffer.from(fixture.encryption.ciphertext, 'base64'); tampered[0] ^= 1;
await assert.rejects(decryptPost({ ...fixture.encryption, ciphertext: tampered.toString('base64') }, fixture.password, fixture.id));
for (const mutation of [{ version: 2 }, { iterations: 1 }, { kdf: 'none' }, { key: 'not-allowed' }, { iv: 'AA==' }]) assert.throws(() => validateEnvelope({ ...fixture.encryption, ...mutation }));
assert.throws(() => validatePayload({ html: '', assets: [{ ...fixture.payload.assets[0], mime: 'image/svg+xml' }] }));
assert.throws(() => validatePayload({ html: '', assets: [{ ...fixture.payload.assets[0], data: Buffer.from('<html>not an image</html>').toString('base64') }] }));
for (const key of ['password', 'key', 'secret', 'heroImage', 'source', 'html']) assert.throws(() => assertEncryptedRecord({ ...fixture.metadata, [key]: 'private' }, '', fixture.id));
assert.throws(() => assertEncryptedRecord(fixture.metadata, 'PRIVATE_BODY', fixture.id));
const unicodePassword = ' 保留空格与中文密碼 ';
assert.deepEqual(await decryptPost(encryptFixturePayload(fixture.payload, fixture.id, unicodePassword), unicodePassword, fixture.id), fixture.payload, 'Password bytes must not be trimmed or normalized');

assert(!fs.existsSync(file), 'Temporary encryption fixture must not replace an existing article');
let failure;
try {
  fs.writeFileSync(file, fixture.markdown);
  requireBuild();
  const html = read(`posts/${fixture.id}/index.html`);
  assert(html.includes('unlock-form') && html.includes('重新锁定') && html.includes('data-encryption'), 'Encrypted route must render the unlock reader');
  assert(!html.includes('article-toc') && !html.includes('article-cover'), 'Locked article must not render plaintext headings or cover');
  const files = walk(path.join(root, 'dist'));
  for (const target of files.filter((name) => /\.(?:html|xml|json|js|css|map)$/.test(name))) {
    const output = fs.readFileSync(target, 'utf8');
    for (const secret of [secretMarker, fixture.password, secretImage, secretPdf, '私密标题', '私密图片']) assert(!output.includes(secret), `Private content leaked into ${path.relative(root, target)}`);
  }
  const search = JSON.parse(read('search-index.json')).find((item) => item.id === fixture.id);
  assert(search.text.includes('公开标题') && search.text.includes('公开标签'), 'Encrypted metadata must remain searchable');
  assert(!search.text.includes(fixture.encryption.ciphertext) && !search.text.includes(secretMarker), 'Encrypted payload must not enter search index');
  assert(read('all/index.html').includes('🔒 加密'), 'Archives must identify encrypted posts');
  for (const [source, reason] of [
    [fixture.markdown + '\nPLAINTEXT_SHOULD_FAIL\n', 'plaintext body'],
    [fixture.markdown.replace('\n---\n', '\npassword: SHOULD_FAIL\n---\n'), 'password metadata'],
    [fixture.markdown.replace('\n---\n', '\nheroImage: /images/SHOULD_FAIL.png\n---\n'), 'public cover'],
  ]) {
    fs.writeFileSync(file, source);
    assert.notEqual(build().status, 0, `Build must reject ${reason}`);
  }
} catch (error) { failure = error; }
finally { fs.unlinkSync(file); requireBuild(); }
if (failure) throw failure;
assert(!fs.existsSync(path.join(root, 'dist/posts', fixture.id)), 'Final build must remove temporary encrypted fixture');
console.log('PASS: cross-platform crypto, exact password bytes, wrong-password/id/tampering rejection, envelope/assets validation, no plaintext leaks, metadata-only search, fail-closed builds, clean final output.');
