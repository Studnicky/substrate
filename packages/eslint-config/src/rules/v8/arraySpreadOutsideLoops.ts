import type { Rule } from 'eslint';

import { LoopContext } from '../shared/LoopContext.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ArraySpreadOutsideLoopsConstants.js';

// PER-ITERATION IS RESOLVED VIA `LoopContext`, NOT `FunctionScope.isInsideLoop`. A spread
// inside a `.forEach()`/`.map()` callback allocates a fresh array once per element,
// identically to one written with a loop keyword — `LoopContext.isPerIteration` treats
// the callback as a loop body; the previous `FunctionScope.isInsideLoop` walk stopped at
// the callback's function boundary and missed it. `CallIdentity` is not used here: a
// `SpreadElement` inside an `ArrayExpression` is pure syntax, not a resolved call, so
// there is no callee signature to resolve identity from — unlike every sibling rule in
// this file set that targets a method call.

class SpreadBinding {
  // A spread element is only the O(n^2) allocate-and-copy anti-pattern when it
  // sits directly in an array literal that is itself bound to something
  // (a reassignment or a fresh declaration) — not when it is nested deeper,
  // and not when the array literal is merely a call argument.
  //
  // Spread used as a CALL ARGUMENT (e.g. `result.push(...items)`) is a related
  // but distinct O(n) pattern — spreading into an argument list rather than
  // into an array literal being bound to a variable/property. It is
  // intentionally out of scope for this rule; naturally excluded here since
  // its immediate parent is a CallExpression, not an ArrayExpression.
  public static isBoundArrayLiteral(arrayExpression: Rule.Node): boolean {
    const parent = arrayExpression.parent;

    if (parent === null) {
      return false;
    }

    if (parent.type === 'AssignmentExpression') {
      const assignment = parent as unknown as { readonly 'left': { readonly 'type': string }; readonly 'right': unknown };

      if (assignment.right !== arrayExpression) {
        return false;
      }

      const result = assignment.left.type === 'Identifier' || assignment.left.type === 'MemberExpression';
      return result;
    }

    if (parent.type === 'VariableDeclarator') {
      const declarator = parent as unknown as { readonly 'init': unknown };

      const result = declarator.init === arrayExpression;
      return result;
    }

    return false;
  }
}

export const arraySpreadOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onSpreadElement: NonNullable<Rule.RuleListener['SpreadElement']> = (node) => {
      const arrayExpression = node.parent as Rule.Node | null;

      if (arrayExpression?.type !== 'ArrayExpression') {
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
