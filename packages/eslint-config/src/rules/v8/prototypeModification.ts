import { createSelectorRule } from './createSelectorRule.js';

export const prototypeModification = createSelectorRule(
  'v8Optimization/prototypeModification',
  'AssignmentExpression[left.property.name="prototype"]',
  'Modifying prototype breaks V8 optimizations.'
);
