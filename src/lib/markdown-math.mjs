import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export const mathRemarkPlugins = [remarkMath];

const renderKatex = rehypeKatex({
  output: 'htmlAndMathml',
  trust: false,
  strict: 'ignore',
  maxExpand: 1000,
  maxSize: 40,
});

const element = (tagName, properties, children) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });
const hasMathClass = (node) => node?.type === 'element' && node.tagName === 'code'
  && node.properties?.className?.includes('language-math');

export function rehypeBlogMath() {
  return (tree, file) => {
    const formulas = new WeakMap();

    function wrapMath(node) {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        const block = child.type === 'element' && child.tagName === 'pre' && hasMathClass(child.children?.[0]);
        const formula = block ? child.children[0] : child;
        if (!hasMathClass(formula)) {
          wrapMath(child);
          return child;
        }

        const properties = block
          ? { className: ['math-block'], tabIndex: 0, role: 'region', ariaLabel: '数学公式' }
          : { className: ['math-inline-wrap'] };
        const wrapper = element(block ? 'div' : 'span', properties, [child]);
        formulas.set(wrapper, {
          source: formula.children.filter(({ type }) => type === 'text').map(({ value }) => value).join(''),
          position: (formula.position ?? child.position)?.start,
        });
        return wrapper;
      });
    }

    wrapMath(tree);
    const firstMessage = file.messages.length;
    renderKatex(tree, file);
    const diagnostics = [];

    for (const issue of file.messages.slice(firstMessage)) {
      if (issue.source !== 'rehype-katex') continue;

      const wrapper = issue.ancestors?.findLast((node) => formulas.has(node));
      const formula = wrapper && formulas.get(wrapper);
      const position = formula?.position || issue.place?.start || issue.place;
      const message = issue.cause?.message || issue.reason;
      diagnostics.push({ message, line: position?.line, column: position?.column });

      if (formula) {
        wrapper.properties.className.push('math-invalid');
        wrapper.properties.title = message;
        wrapper.children = [
          element('span', { className: ['math-error-label'] }, [text('公式有误')]),
          element('code', { className: ['math-error-source'] }, [text(formula.source)]),
        ];
      }
    }

    file.data.mathDiagnostics = diagnostics;
  };
}
