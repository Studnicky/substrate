import { createSelectorRule } from './createSelectorRule.js';

export const computedObjectProperties = createSelectorRule(
  'v8Optimization/computedObjectProperties',
  'ObjectExpression Property[computed=true]:not([key.object.name=/Option$|Type$|Format$|Keyword$|Code$/])',
  'Computed properties in object literals break hidden classes.'
);
