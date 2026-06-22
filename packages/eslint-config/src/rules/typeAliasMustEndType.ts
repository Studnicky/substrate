import type { Rule } from 'eslint';

const createTypeAliasMustEndType: NonNullable<Rule.RuleModule['create']> = (context) => {
  return {
    'TSTypeAliasDeclaration': (node: Rule.Node) => {
      const rawNode = node as unknown as {
        'id': { 'name': string };
        'parent': { 'type': string };
      };

      if (rawNode.parent.type !== 'ExportNamedDeclaration') { return; }
      if (rawNode.id.name.endsWith('Type')) { return; }

      context.report({
        'data': { 'name': rawNode.id.name },
        'messageId': 'mustEndType',
        'node': node
      });
    }
  };
};

export const typeAliasMustEndType: Rule.RuleModule = {
  'create': createTypeAliasMustEndType,
  'meta': {
    'docs': {
      'description':
        'Exported type aliases must end in `Type`. Rename `XxxFoo` to `XxxFooType`.'
    },
    'messages': {
      'mustEndType':
        "Exported type alias '{{name}}' must end in 'Type'. Rename to '{{name}}Type'."
    },
    'schema': [],
    'type': 'problem'
  }
};
