import { decodeBase64, validatePayload } from './encrypted-post.mjs';

// The writer sanitizes Markdown before encryption. This additional reader-side
// check blocks active HTML if a malformed payload ever bypasses that writer.
function safeResource(value, isLink) {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (isLink && (value.startsWith('#') || /^mailto:/i.test(value))) return true;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); }
  catch { return false; }
}

export function mountDecryptedContent(target, payload) {
  validatePayload(payload);
  const urls = new Map();
  const clear = () => {
    target.replaceChildren();
    for (const value of urls.values()) URL.revokeObjectURL(value);
    urls.clear();
  };
  try {
    for (const asset of payload.assets) {
      const bytes = decodeBase64(asset.data);
      urls.set(asset.url, URL.createObjectURL(new Blob([bytes], { type: asset.mime })));
      bytes.fill(0);
    }
    const template = document.createElement('template');
    template.innerHTML = payload.html;
    for (const element of template.content.querySelectorAll('script,iframe,object,embed,base,link,meta,style,form,input,button,textarea,select,template,video,audio,source,animate,animateMotion,animateTransform,set,foreignObject,use,image')) element.remove();
    for (const element of template.content.querySelectorAll('*')) {
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        if (name.startsWith('on') || ['srcdoc', 'srcset', 'formaction', 'action', 'xlink:href', 'background', 'ping'].includes(name)
          || (name === 'style' && /url\s*\(|@import|expression\s*\(/i.test(attribute.value))) element.removeAttribute(attribute.name);
      }
      for (const attribute of ['src', 'href']) {
        if (!element.hasAttribute(attribute)) continue;
        const value = element.getAttribute(attribute);
        const replacement = urls.get(value);
        if (replacement && ((element.tagName === 'IMG' && attribute === 'src') || (element.tagName === 'A' && attribute === 'href'))) {
          element.setAttribute(attribute, replacement);
          if (element.tagName === 'A') element.setAttribute('download', value.split('/').at(-1) || '附件');
        } else if (!safeResource(value, attribute === 'href')) element.removeAttribute(attribute);
        else if (/^\/blog\/(?:images|files)\/uploads\//.test(value)) throw new Error('加密文章缺少附件。');
      }
      if (element.tagName === 'A' && element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
    }
    target.replaceChildren(template.content);
    return clear;
  } catch (error) {
    clear();
    throw error;
  }
}
