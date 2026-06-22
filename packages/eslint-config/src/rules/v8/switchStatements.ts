import { createSelectorRule } from './createSelectorRule.js';

export const switchStatements = createSelectorRule(
  'v8Optimization/switchStatements',
  'SwitchStatement SwitchCase > BlockStatement',
  'Switch cases must be simple calls/returns only.'
);
