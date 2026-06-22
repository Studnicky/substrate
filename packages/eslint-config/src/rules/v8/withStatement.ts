import { createSelectorRule } from './createSelectorRule.js';

export const withStatement = createSelectorRule(
  'v8Optimization/withStatement',
  'WithStatement',
  'with statements are forbidden. They break optimizations.'
);
