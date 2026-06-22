import { createSelectorRule } from './createSelectorRule.js';

export const noConcatInLoops = createSelectorRule(
  'v8Optimization/noConcatInLoops',
  'ForStatement CallExpression[callee.property.name="concat"]',
  'Avoid concat() in loops. It creates new arrays each iteration.'
);
