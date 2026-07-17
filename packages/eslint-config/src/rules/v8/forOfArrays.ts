import type { Rule } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';

export const forOfArrays: Rule.RuleModule = {
  'create': (context) => {
    const onForOfStatement: NonNullable<Rule.RuleListener['ForOfStatement']> = (node) => {
      const { right } = node;
      const servicesUnknown: unknown = context.sourceCode.parserServices;

      if (AstHelpers.hasTypeServices(servicesUnknown)) {
        // Type-checker is authoritative — no name heuristics, no guessing.
        const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(right);
        if (tsNode === undefined) { return; }

        const checker = servicesUnknown.program.getTypeChecker();
        const type = checker.getTypeAtLocation(tsNode);

        const isArray = 'isArrayType' in checker && typeof checker.isArrayType === 'function'
          && checker.isArrayType(type);
        const isTuple = 'isTupleType' in checker && typeof checker.isTupleType === 'function'
          && checker.isTupleType(type);

        if (isArray || isTuple) { context.report({ 'messageId': 'forOfArrays', 'node': node }); }
        return;
      }

      // No type services: only flag the one zero-ambiguity case — a literal array expression.
      // Any identifier or call expression could be a Set, Map, or iterable — do not guess.
      if (right.type === 'ArrayExpression') {
        context.report({ 'messageId': 'forOfArrays', 'node': node });
      }
    };

    return { 'ForOfStatement': onForOfStatement };
  },
  'meta': {
    'docs': {
      'description': 'Disallow for...of over arrays; prefer index loops for V8 optimization.',
      'recommended': false
    },
    'messages': { 'forOfArrays': 'for...of over arrays is forbidden. Use index loops.' },
    'schema': [],
    'type': 'suggestion'
  }
};
