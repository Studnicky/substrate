import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

const TERMINATOR_TYPES: ReadonlySet<string> = new Set([
  'BreakStatement',
  'ContinueStatement',
  'ReturnStatement'
]);

class SwitchCaseShape {
  // Ignores one trailing break/continue/return so a delegate-then-break case is not penalized.
  public static countInlinedStatements(consequent: readonly unknown[]): number {
    if (consequent.length === 0) {
      return 0;
    }

    const last = consequent.at(-1);
    const lastType = Predicates.isRecord(last) ? last.type : undefined;
    const hasTrailingTerminator = typeof lastType === 'string' && TERMINATOR_TYPES.has(lastType);

    const result = hasTrailingTerminator ? consequent.length - 1 : consequent.length;
    return result;
  }
}

// Readability/structure rule, not V8 optimization; see docs/eslint/rules/v8/switch-statements.md.
// Flags both a BlockStatement-wrapped case body and 2+ unbraced statements on SwitchCase.consequent.
export const switchStatements: Rule.RuleModule = {
  'create': (context) => {
    const onBlockStatement = (node: Rule.Node): void => {
      context.report({
        'messageId': 'switchStatements', 'node': node
      });
    };

    const onSwitchCase: NonNullable<Rule.RuleListener['SwitchCase']> = (node) => {
      const consequent = node.consequent;

      if (!Predicates.isArray(consequent)) {
        return;
      }

      // A single BlockStatement child is handled by the dedicated listener above;
      // do not double-report it here.
      if (consequent.length === 1) {
        const only = consequent.at(0);

        if (Predicates.isRecord(only) && only.type === 'BlockStatement') {
          return;
        }
      }

      if (SwitchCaseShape.countInlinedStatements(consequent) >= 2) {
        context.report({
          'messageId': 'switchStatements', 'node': node
        });
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
    'messages': { 'switchStatements': 'switchStatements: Switch cases must be simple calls/returns only — delegate to a static class method, do not inline multi-statement logic. (Readability constraint, not a V8 optimization — case-body size has no effect on dispatch bytecode; see paired rule `max-switch-cases` for the actual performance-relevant constraint on case COUNT.)' },
    'schema': [],
    'type': 'problem'
  }
};
