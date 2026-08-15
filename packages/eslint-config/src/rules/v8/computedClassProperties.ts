import { SelectorRule } from './SelectorRule.js';

export const computedClassProperties = SelectorRule.create(
  'v8Optimization/computedClassProperties',
  'ClassExpression PropertyDefinition[computed=true], ClassDeclaration PropertyDefinition[computed=true], ClassExpression MethodDefinition[computed=true], ClassDeclaration MethodDefinition[computed=true]',
  'Computed properties in classes break hidden classes.'
);
