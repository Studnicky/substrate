import { createSelectorRule } from './createSelectorRule.js';

export const noSpreadInLoops = createSelectorRule(
  'v8Optimization/noSpreadInLoops',
  'ForStatement AssignmentExpression[left.type="Identifier"][right.type="ArrayExpression"] > ArrayExpression > SpreadElement',
  'Never use array spread in loops. It creates O(n^2) work.'
);
