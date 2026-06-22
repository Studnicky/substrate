import type { Rule } from 'eslint';

const createInterfaceMustBeContract: NonNullable<Rule.RuleModule['create']> = (context) => {
  const options = context.options[0] as { 'allow'?: string[] } | undefined;
  const allow = new Set(options?.allow ?? []);

  return {
    'TSInterfaceDeclaration': (node: Rule.Node) => {
      const rawNode = node as unknown as {
        'body': { 'body': { 'type': string }[] };
        'id': { 'name': string };
      };

      if (allow.has(rawNode.id.name)) { return; }

      // TSPropertySignature with a TSFunctionType annotation is a function-valued
      // field (data), NOT behavioral. Only count method/call/construct signatures.
      const hasBehavioralMember = rawNode.body.body.some((member) => {
        return (
          member.type === 'TSMethodSignature'
          || member.type === 'TSCallSignatureDeclaration'
          || member.type === 'TSConstructSignatureDeclaration'
        );
      });

      if (!hasBehavioralMember) {
        context.report({
          'data': { 'name': rawNode.id.name },
          'messageId': 'dataShapeMustBeType',
          'node': node
        });
      }
    }
  };
};

export const interfaceMustBeContract: Rule.RuleModule = {
  'create': createInterfaceMustBeContract,
  'meta': {
    'docs': {
      'description':
        'Interfaces must carry at least one method, call, or construct signature. Data shapes without behavioral members belong in src/types/ as a `type` alias ending in `Type`.'
    },
    'messages': {
      'dataShapeMustBeType':
        "Interface '{{name}}' has no method/call/construct signatures. Data shapes must be declared as `type XxxType = { ... }` in src/types/; `interface` is reserved for behavioral contracts."
    },
    'schema': [
      {
        'properties': {
          'allow': {
            'items': { 'type': 'string' },
            'type': 'array'
          }
        },
        'type': 'object'
      }
    ],
    'type': 'problem'
  }
};
