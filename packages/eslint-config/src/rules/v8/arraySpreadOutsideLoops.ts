import type { Rule } from 'eslint';

import { LoopContext } from '../shared/LoopContext.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ArraySpreadOutsideLoopsConstants.js';

// Per-iteration detection and the CallIdentity exclusion are explained in
// docs/eslint/rules/v8/array-spread-outside-loops.md

class SpreadBinding {
  // Flags only an array literal bound via assignment or declaration; see
  // docs/eslint/rules/v8/array-spread-outside-loops.md for the call-argument exclusion.
  public static isBoundArrayLiteral(arrayExpression: Rule.Node): boolean {
    const parent = arrayExpression.parent;

    if (parent === null) {
      return false;
    }

    if (parent.type === 'AssignmentExpression') {
      if (parent.right !== arrayExpression) {
        return false;
      }

      const result = parent.left.type === 'Identifier' || parent.left.type === 'MemberExpression';
      return result;
    }

    if (parent.type === 'VariableDeclarator') {
      const result = parent.init === arrayExpression;
      return result;
    }

    return false;
  }
}

export const arraySpreadOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onSpreadElement: NonNullable<Rule.RuleListener['SpreadElement']> = (node) => {
      const arrayExpression = node.parent;

      if (arrayExpression.type !== 'ArrayExpression') {
        return;
      }
      if (!SpreadBinding.isBoundArrayLiteral(arrayExpression)) {
        return;
      }
      if (!LoopContext.isPerIteration(node, context)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'SpreadElement': onSpreadElement };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
