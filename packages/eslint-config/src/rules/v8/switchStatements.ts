import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';

const TERMINATOR_TYPES: ReadonlySet<string> = new Set(['BreakStatement', 'ContinueStatement', 'ReturnStatement']);

class SwitchCaseShape {
  // Counts the statements a case body actually inlines, ignoring a single trailing
  // break/continue/return terminator so a one-statement-plus-break case (the
  // idiomatic delegate-then-break shape) is not penalized for the terminator.
  public static countInlinedStatements(consequent: readonly unknown[]): number {
    if (consequent.length === 0) { return 0; }

    const last = consequent.at(-1);
    const lastType = ObjectGuard.isObject(last) ? last.type : undefined;
    const hasTrailingTerminator = typeof lastType === 'string' && TERMINATOR_TYPES.has(lastType);

    return hasTrailingTerminator ? consequent.length - 1 : consequent.length;
  }
}

/**
 * Case bodies must delegate (single call/return), not inline multi-statement
 * logic — regardless of case count. This is independent of the switch-vs
 * dispatch-map choice `maxSwitchCases` enforces at scale: a small switch
 * below that threshold is still required to keep each case a one-line
 * delegation to a static class method, not an inline block.
 *
 * Flags two equivalent shapes with identical runtime characteristics:
 *  - a case body explicitly wrapped in `{ }` (a `BlockStatement`)
 *  - a case body with 2+ statements attached directly to `SwitchCase.consequent`
 *    (braces are optional in JS/TS switch-case syntax)
 */
export const switchStatements: Rule.RuleModule = {
  'create': (context) => {
    const onBlockStatement = (node: Rule.Node): void => {
      context.report({ 'messageId': 'switchStatements', 'node': node });
    };

    const onSwitchCase: NonNullable<Rule.RuleListener['SwitchCase']> = (node) => {
      const raw = node as unknown as Record<string, unknown>;
      const consequent = raw.consequent;
      if (!ObjectGuard.isArray(consequent)) { return; }

      // A single BlockStatement child is handled by the dedicated listener above;
      // do not double-report it here.
      if (consequent.length === 1) {
        const only = consequent.at(0);
        if (ObjectGuard.isObject(only) && only.type === 'BlockStatement') { return; }
      }

      if (SwitchCaseShape.countInlinedStatements(consequent) >= 2) {
        context.report({ 'messageId': 'switchStatements', 'node': node });
      }
    };

    return {
      'SwitchCase': onSwitchCase,
      'SwitchStatement SwitchCase > BlockStatement': onBlockStatement
    };
  },
  'meta': {
    'docs': {
      'description': 'Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic.',
      'recommended': false
    },
    'messages': { 'switchStatements': 'v8Optimization/switchStatements: Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic.' },
    'schema': [],
    'type': 'problem'
  }
};
