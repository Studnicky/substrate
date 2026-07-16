import { SelectorRule } from './SelectorRule.js';

/**
 * Case bodies must delegate (single call/return), not inline multi-statement
 * logic — regardless of case count. This is independent of the switch-vs
 * dispatch-map choice `maxSwitchCases` enforces at scale: a small switch
 * below that threshold is still required to keep each case a one-line
 * delegation to a static class method, not an inline block.
 */
export const switchStatements = SelectorRule.create(
  'v8Optimization/switchStatements',
  'SwitchStatement SwitchCase > BlockStatement',
  'Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic.'
);
