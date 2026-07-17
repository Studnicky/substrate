import { SelectorRule } from './SelectorRule.js';

export const arraySpliceOutsideLoops = SelectorRule.create(
  'v8Optimization/arraySpliceOutsideLoops',
  ':matches(ForStatement, WhileStatement, DoWhileStatement, ForOfStatement, ForInStatement) CallExpression[callee.property.name="splice"]',
  'Avoid splice() in loops. Each call is O(n); repeated calls make the loop O(n^2).'
);
