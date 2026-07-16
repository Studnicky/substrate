import { SelectorRule } from './SelectorRule.js';

export const arrayConcatOutsideLoops = SelectorRule.create(
  'v8Optimization/arrayConcatOutsideLoops',
  'ForStatement CallExpression[callee.property.name="concat"]',
  'Avoid concat() in loops. It creates new arrays each iteration.'
);
