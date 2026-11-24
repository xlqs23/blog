import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { mathRemarkPlugins, rehypeBlogMath } from './markdown-math.mjs';

const previewSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [['className', /^language-./, 'math-inline', 'math-display']],
  },
};

function mapImages(resolveImage) {
  return (tree) => {
    function visit(node) {
      if (node.type === 'element' && node.tagName === 'img' && typeof node.properties.src === 'string') {
        const path = resolveImage(node.properties.src);
        if (typeof path === 'string') node.properties.src = path;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

export async function renderMarkdownPreview(source, { resolveImage } = {}) {
  if (typeof source !== 'string') throw new TypeError('Markdown source must be a string');

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(mathRemarkPlugins)
    .use(remarkRehype, { allowDangerousHtml: false });

  if (resolveImage) processor.use(mapImages, resolveImage);

  // KaTeX output is generated with trust disabled after cleaning the original Markdown tree.
  const result = await processor
    .use(rehypeSanitize, previewSchema)
    .use(rehypeBlogMath)
    .use(rehypeStringify)
    .process(source);

  return { html: String(result), diagnostics: result.data.mathDiagnostics };
}
