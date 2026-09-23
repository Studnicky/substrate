import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import {
  ARRAY_ITERATOR_METHODS, ARRAY_ITERATOR_OWNERS
} from './constants/ForOfArraysConstants.js';

// Measured replacement costs and the CallIdentity signature-resolution rationale:
// docs/eslint/rules/v8/for-of-arrays.md

export const forOfArrays: Rule.RuleModule = {
  'create': (context) => {
    const onForOfStatement: NonNullable<Rule.RuleListener['ForOfStatement']> = (node) => {
      const { right } = node;
      const servicesUnknown: unknown = context.sourceCode.parserServices;

      if (AstHelpers.hasTypeServices(servicesUnknown)) {
        if (right.type === 'CallExpression'
          && CallIdentity.isBuiltinCall(right as unknown as Rule.Node, context, ARRAY_ITERATOR_METHODS, ARRAY_ITERATOR_OWNERS)) {
          context.report({
            'messageId': 'forOfArrays', 'node': node
          });

          return;
        }

        // Type-checker is authoritative — no name heuristics, no guessing.
        const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(right);

        if (tsNode === undefined) {
          return;
        }

        const checker = servicesUnknown.program.getTypeChecker();
        const type = checker.getTypeAtLocation(tsNode);

        const isArray = 'isArrayType' in checker && typeof checker.isArrayType === 'function'
          && checker.isArrayType(type);
        const isTuple = 'isTupleType' in checker && typeof checker.isTupleType === 'function'
          && checker.isTupleType(type);

        if (isArray || isTuple) {
          context.report({
            'messageId': 'forOfArrays', 'node': node
          });
        }

        return;
      }

      // No type services: only flag the one zero-ambiguity case — a literal array expression.
      // Any identifier or call expression could be a Set, Map, or iterable — do not guess.
      if (right.type === 'ArrayExpression') {
        context.report({
          'messageId': 'forOfArrays', 'node': node
        });
      }
    };

    return { 'ForOfStatement': onForOfStatement };
  },
  'meta': {
    'docs': {
      'description': 'Disallow for...of over arrays (directly, or via `.entries()`/`.values()`/`.keys()`); prefer index loops for V8 optimization. Measured 9.3x-13.7x slower than an index loop at 5,000,000 elements — `.entries()` is the slowest form measured, worse than plain for...of.',
      'recommended': false
    },
    'messages': { 'forOfArrays': 'for...of over arrays (including via .entries()/.values()/.keys()) is forbidden. Use index loops.' },
    'schema': [],
    'type': 'suggestion'
  }
};
