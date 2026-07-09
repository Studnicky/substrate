import type { Rule } from 'eslint';

const isObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);};

class NodeType {
  static get(rawNode: unknown): string {
    if (!isObject(rawNode)) { return ''; }

    const nodeType: unknown = rawNode.type;
    return typeof nodeType === 'string' ? nodeType : '';
  }
}

class Member {
  static getName(member: unknown): string {
    if (!isObject(member)) { return '<unnamed>'; }

    const key: unknown = member.key;
    if (!isObject(key)) { return '<unnamed>'; }

    if (key.type === 'Identifier') {
      const name: unknown = key.name;
      return typeof name === 'string' && name.length > 0 ? name : '<unnamed>';
    }

    if (key.type === 'Literal') {
      const value: unknown = key.value;
      return typeof value === 'string' && value.length > 0 ? value : '<unnamed>';
    }

    return '<unnamed>';
  }
}

class Parent {
  static get(rawNode: unknown): unknown {
    return isObject(rawNode) ? rawNode.parent : undefined;
  }
}

const hasTypeParameterAncestor = (rawNode: unknown): boolean => {
  let current: unknown = Parent.get(rawNode);

  while (isObject(current)) {
    const nodeType = NodeType.get(current);

    if (nodeType === 'TSTypeParameter') { return true; }
    if (nodeType === 'TSInterfaceDeclaration') { break; }

    current = Parent.get(current);
  }

  return false;
};

class OwningMember {
  static find(rawNode: unknown): unknown {
    let current: unknown = Parent.get(rawNode);

    while (isObject(current)) {
      const nodeType = NodeType.get(current);

      if (
        nodeType === 'TSPropertySignature'
        || nodeType === 'TSMethodSignature'
        || nodeType === 'TSIndexSignature'
      ) {
        return current;
      }

      if (nodeType === 'TSInterfaceBody' || nodeType === 'TSInterfaceDeclaration') { return null; }

      current = Parent.get(current);
    }

    return null;
  }
}

class InterfaceName {
  static get(rawNode: unknown): string {
    let current: unknown = Parent.get(rawNode);

    while (isObject(current)) {
      const nodeType = NodeType.get(current);

      if (nodeType === 'TSInterfaceDeclaration') {
        const idNode: unknown = current.id;
        if (!isObject(idNode)) { return '<unnamed>'; }

        const name: unknown = idNode.name;
        return typeof name === 'string' ? name : '<unnamed>';
      }

      current = Parent.get(current);
    }

    return '<unnamed>';
  }
}

export const interfacesComposeNamedTypes: Rule.RuleModule = {
  'create': (context) => {
    const onTSInterfaceDeclarationTSTypeLiteral = (node: Rule.Node): void => {
      if (hasTypeParameterAncestor(node)) { return; }

      const interfaceName = InterfaceName.get(node);
      const owningMember = OwningMember.find(node);
      const memberName = owningMember !== null ? Member.getName(owningMember) : '<unnamed>';

      context.report({
        'data': {
          'interfaceName': interfaceName,
          'memberName': memberName
        },
        'messageId': 'inlineObjectInInterface',
        'node': node
      });
    };

    return { 'TSInterfaceDeclaration TSTypeLiteral': onTSInterfaceDeclarationTSTypeLiteral };
  },
  'meta': {
    'docs': {
      'description': 'Interfaces must reference named types. Inline object literals inside interface bodies are forbidden.',
      'recommended': false
    },
    'messages': {
      'inlineObjectInInterface':
        "Interface '{{interfaceName}}' uses an inline object type at member '{{memberName}}'. Interfaces must compose by referencing named types — extract '{{memberName}}'s inline shape to an entity (export namespace XxxEntity { Schema, Type, validate }) and reference its Type here. A bare type alias is not a valid extraction target — free-standing type aliases are forbidden outside entities."
    },
    'schema': [],
    'type': 'problem'
  }
};
