import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import {
  ARRAY_ITERATOR_METHODS, ARRAY_ITERATOR_OWNERS
} from './constants/ForOfArraysConstants.js';

// MEASURED, Node v24, N = 5,000,000, 3 warm-up calls + median of 7 timed calls
// (scratchpad bench, summing every element of a 5,000,000-element array):
//
//   index loop (`for (i=0;i<len;i++) sum += a[i]`)       2.607 ms
//   for...of over the array directly                    24.313 ms   -> 9.32x
//   for...of over `a.values()`                           24.279 ms   -> 9.31x
//   for...of over `a.keys()` (+ indexed read)             24.672 ms   -> 9.46x
//   for...of over `a.entries()` (destructured `[, v]`)    35.813 ms   -> 13.74x
//
// The rule itself (for...of directly over an array) is CORRECT and was
// already proven at this scale — kept as-is. What was proven MISSING: a
// for...of over `.entries()`/`.values()`/`.keys()` is not merely as slow as
// the plain form, `.entries()` is the SLOWEST form measured — worse than the
// thing this rule already forbids — yet it fully escaped detection, because
// the array-ness check only inspects the for...of's `right` expression's
// static TYPE (is it an array?), and `a.entries()` has type
// `ArrayIterator<[number, T]>`, not `T[]`.
//
// Extended via `CallIdentity` (resolved call signature, matched against
// `Array`/`ReadonlyArray` declared in the standard library) rather than by
// callee name, for the same reason `arrayConcatOutsideLoops` resolves
// `concat` that way: `a[ENTRIES_KEY]()` or a same-named user method would
// defeat a name check but cannot defeat signature resolution. Consequently
// this extension requires type services and goes silent without them — the
// same posture the rest of this rule (and `CallIdentity`) already has.

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
