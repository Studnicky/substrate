import { SelectorRule } from './SelectorRule.js';

export const arraySpreadOutsideLoops = SelectorRule.create(
  'v8Optimization/arraySpreadOutsideLoops',
  'ForStatement AssignmentExpression[left.type="Identifier"][right.type="ArrayExpression"] > ArrayExpression > SpreadElement',
  'Never use array spread in loops. It creates O(n^2) work.'
);
