import type { Rule } from 'eslint';
import type ts from 'typescript';

type ParserServicesType = {
  readonly 'esTreeNodeToTSNodeMap'?: Map<unknown, ts.Node>;
  readonly 'program'?: ts.Program;
};

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && value !== undefined && typeof value === 'object';

const hasTypeServices = (value: unknown): value is Required<ParserServicesType> => {
  if (!isNonNullObject(value)) {
    return false;
  }

  if (!('program' in value) || !isNonNullObject(value.program)) {
    return false;
  }

  return typeof value.program.getTypeChecker === 'function'
    && 'esTreeNodeToTSNodeMap' in value
    && value.esTreeNodeToTSNodeMap instanceof Map;
};

const shouldIgnoreIdentifierName = (name: string): boolean =>
  (/[Mm]ap|[Ss]et|[Ee]ntries|[Kk]eys|[Vv]alues|[Ii]terator/v).test(name);

const createForOfArrays: NonNullable<Rule.RuleModule['create']> = (context) => {
  const onForOfStatement: NonNullable<Rule.RuleListener['ForOfStatement']> = (node) => {
    const { right } = node;

    if (right.type === 'ArrayExpression') {
      context.report({
        'messageId': 'forOfArrays',
        'node': node
      });

      return;
    }

    const servicesUnknown: unknown = context.sourceCode.parserServices;

    if (hasTypeServices(servicesUnknown)) {
      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(right);

      if (tsNode !== undefined) {
        const checker = servicesUnknown.program.getTypeChecker();
        const type = checker.getTypeAtLocation(tsNode);

        const isArray = 'isArrayType' in checker && typeof checker.isArrayType === 'function'
          && checker.isArrayType(type);
        const isTuple = 'isTupleType' in checker && typeof checker.isTupleType === 'function'
          && checker.isTupleType(type);

        if (isArray || isTuple) {
          context.report({
            'messageId': 'forOfArrays',
            'node': node
          });
        }

        return;
      }
    }

    if (right.type === 'Identifier') {
      if (!shouldIgnoreIdentifierName(right.name)) {
        context.report({
          'messageId': 'forOfArrays',
          'node': node
        });
      }

      return;
    }

    if (
      right.type === 'CallExpression'
      && right.callee.type === 'MemberExpression'
      && right.callee.property.type === 'Identifier'
    ) {
      const { name } = right.callee.property;

      if (name !== 'entries' && name !== 'keys' && name !== 'values') {
        context.report({
          'messageId': 'forOfArrays',
          'node': node
        });
      }
    }
  };

  return { 'ForOfStatement': onForOfStatement };
};

export const forOfArrays: Rule.RuleModule = {
  'create': createForOfArrays,
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
