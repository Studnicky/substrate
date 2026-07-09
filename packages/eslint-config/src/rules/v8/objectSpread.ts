import { SelectorRule } from './SelectorRule.js';

export const objectSpread = SelectorRule.create(
  'v8Optimization/objectSpread',
  'MethodDefinition[kind="constructor"] ObjectExpression SpreadElement',
  'Object spread inside a constructor can break hidden classes. Assign properties explicitly.'
);
