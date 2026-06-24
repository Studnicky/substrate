import type { Rule } from 'eslint';

export const typeAliasMustEndType: Rule.RuleModule = {
  'create': (context) => {
    const listener: NonNullable<Rule.RuleListener['TSTypeAliasDeclaration']> = (node: Rule.Node) => {
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
    };
    return { 'TSTypeAliasDeclaration': listener };
  },
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
