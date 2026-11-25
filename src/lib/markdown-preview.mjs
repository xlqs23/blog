import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { mathRemarkPlugins, rehypeBlogMath } from './markdown-math.mjs';
import { rehypePdfDocuments } from './markdown-pdf.mjs';

const previewSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
  },
};

function mapAssets({ resolveImage, resolveLink }) {
  return (tree) => {
    function visit(node) {
      if (resolveImage && node.type === 'element' && node.tagName === 'img' && typeof node.properties.src === 'string') {
        const path = resolveImage(node.properties.src);
        if (typeof path === 'string') node.properties.src = path;
      }
      if (resolveLink && node.type === 'element' && node.tagName === 'a' && typeof node.properties.href === 'string') {
        const path = resolveLink(node.properties.href);
        if (typeof path === 'string') node.properties.href = path;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

export async function renderMarkdownPreview(source, { resolveImage, resolveLink } = {}) {
  if (typeof source !== 'string') throw new TypeError('Markdown source must be a string');

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(mathRemarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: false });

  if (resolveImage || resolveLink) processor.use(mapAssets, { resolveImage, resolveLink });

  // KaTeX output is generated with trust disabled after cleaning the original Markdown tree.
  const result = await processor
    .use(rehypeSanitize, previewSchema)
    .use(rehypePdfDocuments)
    .use(rehypeBlogMath)
    .use(rehypeStringify)
    .process(source);

  return { html: String(result), diagnostics: result.data.mathDiagnostics };
}
