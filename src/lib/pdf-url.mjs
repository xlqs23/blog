// Shared by the Markdown renderer and browser reader. Only document URLs are
// accepted; uploaded local documents always use the configured /blog base.
export function normalizePdfUrl(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u0020\u007f<>"'`\\]/.test(value)) return null;
  let decoded;
  try { decoded = decodeURIComponent(value.split(/[?#]/, 1)[0]); } catch { return null; }
  if (/[\u0000-\u0020\u007f<>"'`\\]/.test(decoded) || decoded.split('/').some(part => part === '..' || part === '.') || /%[0-9a-f]{2}/i.test(decoded)) return null;
  const local = value.match(/^\/?(?:blog\/)?((?:files|images)\/uploads\/[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.pdf)([?#].*)?$/i);
  if (local && !local[1].includes('..')) return `/blog/${local[1]}${local[2] || ''}`;
  if (!/^https:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || !/\.pdf$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function pdfFileName(value) {
  try { return decodeURIComponent(value.split(/[?#]/, 1)[0].split('/').at(-1) || 'document.pdf'); }
  catch { return 'document.pdf'; }
}
