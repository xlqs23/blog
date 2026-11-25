// Shared by the browser reader and interoperability tests. No Node-only imports.
export const MAX_CIPHERTEXT_BASE64 = 64 * 1024 * 1024;
export const MAX_ASSET_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_ASSET_BYTES = 20 * 1024 * 1024;
const envelopeKeys = ['version', 'kdf', 'hash', 'iterations', 'salt', 'iv', 'ciphertext'];
const publicKeys = new Set(['title', 'description', 'pubDate', 'updatedDate', 'tags', 'category', 'draft', 'encrypted', 'encryption']);
const assetTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf']);

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function decodeBase64(value, maximum = MAX_CIPHERTEXT_BASE64) {
  if (typeof value !== 'string' || !value.length || value.length > maximum || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error('加密数据格式无效。');
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function validateEnvelope(encryption) {
  if (!exactKeys(encryption, envelopeKeys) || encryption.version !== 1 || encryption.kdf !== 'PBKDF2' || encryption.hash !== 'SHA-256' || encryption.iterations !== 600000) throw new Error('不支持的文章加密格式。');
  if (decodeBase64(encryption.salt, 24).byteLength !== 16 || decodeBase64(encryption.iv, 16).byteLength !== 12 || decodeBase64(encryption.ciphertext).byteLength <= 16) throw new Error('加密数据长度无效。');
  return encryption;
}

export function assertEncryptedRecord(data, body = '', id = '') {
  if (data?.encrypted !== true) {
    if (data?.encryption !== undefined) throw new Error(`文章 ${id} 的加密标记与数据不一致。`);
    return;
  }
  if (typeof body !== 'string' || body.trim()) throw new Error(`加密文章 ${id} 不能包含公开正文。`);
  if (Object.keys(data).some((key) => !publicKeys.has(key))) throw new Error(`加密文章 ${id} 含未允许的公开字段；请移除封面、密码、密钥或其他私密字段。`);
  validateEnvelope(data.encryption);
}

function validMagic(bytes, mime) {
  const starts = (...values) => values.every((value, index) => bytes[index] === value);
  const ascii = (start, end) => String.fromCharCode(...bytes.subarray(start, end));
  return mime === 'image/png' ? starts(137, 80, 78, 71, 13, 10, 26, 10)
    : mime === 'image/jpeg' ? starts(255, 216, 255)
      : mime === 'image/gif' ? /^GIF8[79]a$/.test(ascii(0, 6))
        : mime === 'image/webp' ? ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP'
          : mime === 'application/pdf' && ascii(0, 5) === '%PDF-';
}

export function validatePayload(payload) {
  if (!exactKeys(payload, ['html', 'assets']) || typeof payload.html !== 'string' || !Array.isArray(payload.assets) || payload.assets.length > 100) throw new Error('解密后的文章格式无效。');
  const urls = new Set();
  let total = 0;
  for (const asset of payload.assets) {
    if (!exactKeys(asset, ['url', 'mime', 'data']) || typeof asset.url !== 'string' || !/^\/blog\/(?:images|files)\/uploads\/[a-zA-Z0-9._-]+$/.test(asset.url) || asset.url.includes('..') || urls.has(asset.url) || !assetTypes.has(asset.mime)) throw new Error('文章附件格式无效。');
    const bytes = decodeBase64(asset.data, Math.ceil(MAX_ASSET_BYTES / 3) * 4);
    total += bytes.byteLength;
    if (!bytes.byteLength || bytes.byteLength > MAX_ASSET_BYTES || total > MAX_TOTAL_ASSET_BYTES || !validMagic(bytes, asset.mime)) throw new Error('文章附件格式或大小无效。');
    urls.add(asset.url);
  }
  return payload;
}

export async function decryptPost(encryption, password, postId) {
  validateEnvelope(encryption);
  if (typeof password !== 'string' || !password.length || typeof postId !== 'string' || !postId) throw new Error('请输入文章密码。');
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持安全解密，请通过 HTTPS 打开本站。');
  const text = new TextEncoder();
  const passwordBytes = text.encode(password);
  let plaintext;
  try {
    const material = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: decodeBase64(encryption.salt) }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64(encryption.iv), additionalData: text.encode(`xlqs-blog:${postId}:v1`), tagLength: 128 }, key, decodeBase64(encryption.ciphertext)));
    return validatePayload(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)));
  } finally {
    passwordBytes.fill(0);
    plaintext?.fill(0);
  }
}
