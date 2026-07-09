import { SelectorRule } from './SelectorRule.js';

/**
 * Case bodies must delegate (single call/return), not inline multi-statement
 * logic — regardless of case count. This is independent of the switch-vs
 * dispatch-map choice `maxSwitchCases` enforces at scale: a small switch
 * below that threshold is still required to keep each case a one-line
 * delegation to a named function, not an inline block.
 */
export const switchStatements = SelectorRule.create(
  'v8Optimization/switchStatements',
  'SwitchStatement SwitchCase > BlockStatement',
  'Switch cases must be simple calls/returns only — delegate to a named function, do not inline multi-statement logic.'
);
