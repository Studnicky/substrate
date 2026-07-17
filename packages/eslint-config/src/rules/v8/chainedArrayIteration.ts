import { SelectorRule } from './SelectorRule.js';

export const chainedArrayIteration = SelectorRule.create(
  'v8Optimization/chainedArrayIteration',
  'CallExpression[callee.property.name=/^(map|filter)$/][callee.object.type="CallExpression"][callee.object.callee.property.name=/^(map|filter)$/]',
  'Chaining map()/filter() allocates an intermediate array and iterates twice. Use a single reduce() to do both passes in one.'
);
