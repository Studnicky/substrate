import type { Rule } from 'eslint';

import { DeclarationIdName } from './shared/declarationIdName.js';

class InterfaceSuffix {
  static create(context: Rule.RuleContext): Rule.RuleListener {
    function onTSInterfaceDeclaration(node: Rule.Node): void {
      const name = DeclarationIdName.get(node);
      if (name.endsWith('Interface')) { return; }
      context.report({ 'data': { 'name': name }, 'messageId': 'missing-interface-suffix', 'node': node });
    }
    return { 'TSInterfaceDeclaration': onTSInterfaceDeclaration };
  }
}

export const interfaceSuffix: Rule.RuleModule = {
  'create': InterfaceSuffix.create,
  'meta': {
    'docs': { 'description': "Every interface declaration's name must end with 'Interface' — no exemptions, including interfaces declared inside a namespace.", 'recommended': false },
    'messages': { 'missing-interface-suffix': 'Interface name \'{{name}}\' must end with \'Interface\'. This applies everywhere, including inside namespaces — the suffix is not optional.' },
    'schema': [],
    'type': 'problem'
  }
};
