import { createSelectorRule } from './createSelectorRule.js';

export const defineProperty = createSelectorRule(
  'v8Optimization/defineProperty',
  'CallExpression[callee.object.name="Object"][callee.property.name="defineProperty"]',
  'Object.defineProperty breaks hidden classes.'
);
