import { createSelectorRule } from './createSelectorRule.js';

export const arrayFromIterators = createSelectorRule(
  'v8Optimization/arrayFromIterators',
  'CallExpression[callee.object.name="Array"][callee.property.name="from"][arguments.0.type="CallExpression"][arguments.0.callee.property.name=/entries|keys|values/]',
  'Avoid Array.from on iterators in hot paths.'
);
