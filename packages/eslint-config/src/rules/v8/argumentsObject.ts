import { SelectorRule } from './SelectorRule.js';

// Measured costs and the blanket-ban rationale: docs/eslint/rules/v8/arguments-object.md
export const argumentsObject = SelectorRule.create(
  'v8Optimization/argumentsObject',
  'Identifier[name="arguments"]:not(MemberExpression > .property)',
  'arguments object is forbidden — use rest parameters. Only an ESCAPING `arguments` (assigned out, passed to another function, spread, returned) is measurably costly (7.5x at 5,000,000 calls); a benign `.length`/indexed read measures identical to rest params. The ban is uniform anyway: rest params are never worse, and the escaping/benign distinction is not one this rule should have to get right to be trusted.'
);
