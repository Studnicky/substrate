import { SelectorRule } from './SelectorRule.js';

export const dynamicPropertyAccess = SelectorRule.create(
  'v8Optimization/dynamicPropertyAccess',
  'ObjectExpression MemberExpression[computed=true]',
  'Dynamic (computed) property access inside an object literal breaks hidden classes.'
);
