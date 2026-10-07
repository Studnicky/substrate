import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import {
  REQUIRES_BINDING_TYPES, TS_WRAPPER_EXPRESSION_TYPES
} from './constants/ExplicitReturnBindingConstants.js';
import { AstHelpers } from './shared/astHelpers.js';

// Requires a bound `return` for call/operator results (REQUIRES_BINDING_TYPES); does
// not fight inline-trivial-logic. See explicit-return-binding.md for the survey evidence.

class ReturnArgumentClassification {
  public static unwrap(node: unknown): unknown {
    let current = node;

    while (
      Predicates.isRecord(current)
      && typeof current.type === 'string'
      && TS_WRAPPER_EXPRESSION_TYPES.has(current.type)
    ) {
      current = current.expression;
    }

    return current;
  }

  public static requiresBinding(argument: unknown): boolean {
    const unwrapped = ReturnArgumentClassification.unwrap(argument);
    const type = AstHelpers.getNodeType(unwrapped);

    if (type === undefined) {
      return false;
    }

    const result = REQUIRES_BINDING_TYPES.has(type);

    return result;
  }
}

export const explicitReturnBinding: Rule.RuleModule = {
  'create': (context) => {
    const onReturnStatement: NonNullable<Rule.RuleListener['ReturnStatement']> = (node) => {
      const { argument } = node;

      if (argument === null || argument === undefined) {
        return;
      }
      if (!ReturnArgumentClassification.requiresBinding(argument)) {
        return;
      }
      // `v8/switch-statements` forbids wrapping a case body in a block to add a
      // binding, so a direct SwitchCase return cannot satisfy both rules.
      if (AstHelpers.getParent(node)?.type === 'SwitchCase') {
        return;
      }

      context.report({
        'messageId': 'unbound',
        'node': node
      });
    };

    return { 'ReturnStatement': onReturnStatement };
  },
  'meta': {
    'docs': {
      'description': 'Require a `return` that does work (a call or an operator expression) to bind its result to a `const` first, on its own line, rather than returning the computation inline.',
      'recommended': false
    },
    'messages': { 'unbound': 'Bind the result of this expression to a `const` before returning it — e.g. `const result = <expr>; return result;` — instead of returning it inline.' },
    'schema': [],
    'type': 'problem'
  }
};
