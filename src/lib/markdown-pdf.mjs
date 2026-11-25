import { normalizePdfUrl, pdfFileName } from './pdf-url.mjs';

const text = value => ({ type: 'text', value });
const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const plainText = node => node.type === 'text' ? node.value : (node.children || []).map(plainText).join('');

// A PDF link on its own line is a document. Links within a sentence stay links.
// Run after sanitizing user Markdown; no raw iframe HTML is admitted here.
export function rehypePdfDocuments() {
  return tree => {
    const visit = parent => {
      if (!parent.children) return;
      parent.children = parent.children.map(node => {
        if (node.type === 'element' && node.tagName === 'p') {
          const children = (node.children || []).filter(child => child.type !== 'text' || child.value.trim());
          const link = children.length === 1 && children[0];
          const url = link?.tagName === 'a' && normalizePdfUrl(link.properties?.href);
          if (url) {
            const title = plainText(link).trim() || pdfFileName(url);
            return element('section', { className: ['pdf-document'], ariaLabel: `PDF 文档：${title}` }, [
              element('div', { className: ['pdf-document-header'] }, [
                element('span', { className: ['pdf-document-badge'], ariaHidden: 'true' }, [text('PDF')]),
                element('strong', { className: ['pdf-document-title'] }, [text(title)]),
                element('div', { className: ['pdf-document-actions'] }, [
                  element('a', { className: ['pdf-document-open'], href: url, target: '_blank', rel: ['noopener', 'noreferrer'] }, [text('新窗口打开')]),
                  element('a', { className: ['pdf-document-download'], href: url, download: pdfFileName(url), target: '_blank', rel: ['noopener', 'noreferrer'] }, [text('下载 PDF')]),
                ]),
              ]),
              element('p', { className: ['pdf-document-note'] }, [text('若无法在页面内预览，可在新窗口打开或下载 PDF。')]),
            ]);
          }
        }
        visit(node);
        return node;
      });
    };
    visit(tree);
  };
}
