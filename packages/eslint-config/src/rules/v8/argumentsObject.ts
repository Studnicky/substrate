import { createSelectorRule } from './createSelectorRule.js';

export const argumentsObject = createSelectorRule(
  'v8Optimization/argumentsObject',
  'Identifier[name="arguments"]',
  'arguments object is forbidden. Use rest parameters.'
);
