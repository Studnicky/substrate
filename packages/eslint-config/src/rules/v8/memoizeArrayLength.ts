import { SelectorRule } from './SelectorRule.js';

export const memoizeArrayLength = SelectorRule.create(
  'v8Optimization/memoizeArrayLength',
  'ForStatement[test.left.type="Identifier"][test.operator="<"][test.right.type="MemberExpression"][test.right.property.name="length"]',
  'Re-reading array.length on every loop iteration prevents V8 optimization. Memoize the length into a variable before the loop.'
);
