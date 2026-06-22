import { createSelectorRule } from './createSelectorRule.js';

export const forInLoops = createSelectorRule(
  'v8Optimization/forInLoops',
  'ForInStatement',
  'for...in loops are forbidden. Use Object.keys/entries.'
);
