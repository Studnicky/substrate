import { createSelectorRule } from './createSelectorRule.js';

export const deleteProperty = createSelectorRule(
  'v8Optimization/deleteProperty',
  'UnaryExpression[operator="delete"][argument.type="MemberExpression"]',
  'delete on member expressions is forbidden. It breaks V8 optimizations.'
);
