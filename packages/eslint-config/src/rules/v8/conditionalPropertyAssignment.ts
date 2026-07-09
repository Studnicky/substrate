import { SelectorRule } from './SelectorRule.js';

export const conditionalPropertyAssignment = SelectorRule.create(
  'v8Optimization/conditionalPropertyAssignment',
  'MethodDefinition[kind="constructor"] IfStatement AssignmentExpression[left.type="MemberExpression"][left.object.type="ThisExpression"]',
  'Conditional property assignment in a constructor breaks hidden classes. Assign every property unconditionally.'
);
