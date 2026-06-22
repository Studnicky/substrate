import { createSelectorRule } from './createSelectorRule.js';

export const computedClassProperties = createSelectorRule(
  'v8Optimization/computedClassProperties',
  'ClassExpression Property[computed=true], ClassDeclaration Property[computed=true]',
  'Computed properties in classes break hidden classes.'
);
