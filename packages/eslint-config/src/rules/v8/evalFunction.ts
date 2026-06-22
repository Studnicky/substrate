import { createSelectorRule } from './createSelectorRule.js';

export const evalFunction = createSelectorRule(
  'v8Optimization/evalFunction',
  'CallExpression[callee.name="eval"]',
  'eval() is forbidden. It breaks optimizations and is a security risk.'
);
