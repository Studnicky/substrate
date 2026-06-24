import { createSelectorRule } from './createSelectorRule.js';

export const computedObjectProperties = createSelectorRule(
  'v8Optimization/computedObjectProperties',
  'ObjectExpression Property[computed=true]',
  'Computed properties in object literals break hidden classes.'
);
