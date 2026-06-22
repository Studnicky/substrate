import { createSelectorRule } from './createSelectorRule.js';

export const memoizeArrayLength = createSelectorRule(
  'v8Optimization/memoizeArrayLength',
  'ForStatement[test.left.type="Identifier"][test.operator="<"][test.right.type="MemberExpression"][test.right.property.name="length"]',
  'Memoize array.length in loops for V8 optimization.'
);
