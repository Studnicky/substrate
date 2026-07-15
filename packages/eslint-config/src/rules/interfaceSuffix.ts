import type { Rule } from 'eslint';

class NodeName {
  static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }

  static get(rawNode: unknown): string {
    if (!NodeName.isObject(rawNode)) { return ''; }
    const idNode: unknown = rawNode.id;
    if (!NodeName.isObject(idNode)) { return ''; }
    const name: unknown = idNode.name;
    return typeof name === 'string' ? name : '';
  }
}

class InterfaceSuffix {
  static create(context: Rule.RuleContext): Rule.RuleListener {
    function onTSInterfaceDeclaration(node: Rule.Node): void {
      const name = NodeName.get(node);
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
