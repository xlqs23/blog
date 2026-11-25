import { normalizePdfUrl, pdfFileName } from './pdf-url.mjs';

function sourceUrl(value, allowedBlobUrls, protectedContent) {
  if (allowedBlobUrls.has(value) && typeof value === 'string' && value.startsWith('blob:')) return value;
  return protectedContent ? null : normalizePdfUrl(value);
}

function createCard(link, url, document) {
  const card = document.createElement('section');
  card.className = 'pdf-document';
  const title = link.textContent.trim() || pdfFileName(url);
  card.setAttribute('aria-label', `PDF 文档：${title}`);
  const header = document.createElement('div');
  header.className = 'pdf-document-header';
  const badge = document.createElement('span');
  badge.className = 'pdf-document-badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = 'PDF';
  const label = document.createElement('strong');
  label.className = 'pdf-document-title';
  label.textContent = title;
  const actions = document.createElement('div');
  actions.className = 'pdf-document-actions';
  const open = document.createElement('a');
  open.className = 'pdf-document-open';
  open.href = url;
  open.textContent = '新窗口打开';
  const download = document.createElement('a');
  download.className = 'pdf-document-download';
  download.href = url;
  download.download = link.getAttribute('download') || pdfFileName(url);
  download.textContent = '下载 PDF';
  for (const anchor of [open, download]) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
  actions.append(open, download);
  header.append(badge, label, actions);
  const note = document.createElement('p');
  note.className = 'pdf-document-note';
  note.textContent = '若无法在页面内预览，可在新窗口打开或下载 PDF。';
  card.append(header, note);
  return card;
}

export function enhancePdfDocuments(root, { allowedBlobUrls = new Set(), protectedContent = false } = {}) {
  const document = root.ownerDocument || root;
  // Older encrypted articles contain ordinary anchors; upgrade them only after
  // the reader has validated the bundled PDF and replaced its URL with a Blob.
  for (const paragraph of root.querySelectorAll('p')) {
    if (!protectedContent && paragraph.closest('.encrypted-post')) continue;
    if (paragraph.closest('.pdf-document')) continue;
    const children = [...paragraph.childNodes].filter(node => node.nodeType !== 3 || node.textContent.trim());
    const link = children.length === 1 && children[0];
    if (link?.nodeType !== 1 || link.tagName !== 'A') continue;
    const url = sourceUrl(link.getAttribute('href'), allowedBlobUrls, protectedContent);
    if (url) paragraph.replaceWith(createCard(link, url, document));
  }
  for (const card of root.querySelectorAll('.pdf-document')) {
    if (!protectedContent && card.closest('.encrypted-post')) continue;
    if (card.querySelector('iframe.pdf-document-frame')) continue;
    const open = card.querySelector('a.pdf-document-open');
    const url = open && sourceUrl(open.getAttribute('href'), allowedBlobUrls, protectedContent);
    if (!url) continue;
    open.href = url;
    open.removeAttribute('download');
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    const download = card.querySelector('a.pdf-document-download');
    if (download) { download.href = url; download.target = '_blank'; download.rel = 'noopener noreferrer'; }
    // A remote .pdf URL can actually return HTML. Keep its explicit open link,
    // but only embed uploads and MIME-validated decrypted PDF blobs. Sandboxed
    // frames cannot reliably use the browser's built-in PDF viewer.
    if (/^https:/i.test(url)) {
      const note = card.querySelector('.pdf-document-note');
      if (note) note.textContent = '外部 PDF 可在新窗口打开；上传到博客的 PDF 支持页面内预览。';
      continue;
    }
    if (document.defaultView?.navigator.pdfViewerEnabled === false) continue;
    const frame = document.createElement('iframe');
    frame.className = 'pdf-document-frame';
    frame.title = `PDF 预览：${card.querySelector('.pdf-document-title')?.textContent || '文档'}`;
    frame.setAttribute('loading', 'lazy');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.src = url;
    const note = card.querySelector('.pdf-document-note');
    card.insertBefore(frame, note);
  }
}
