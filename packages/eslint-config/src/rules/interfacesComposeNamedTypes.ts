import type { Rule } from 'eslint';

class TypeGuards {
  static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }
}

class NodeType {
  static get(rawNode: unknown): string {
    if (!TypeGuards.isObject(rawNode)) { return ''; }

    const nodeType: unknown = rawNode.type;
    return typeof nodeType === 'string' ? nodeType : '';
  }
}

class Member {
  static getName(member: unknown): string {
    if (!TypeGuards.isObject(member)) { return '<unnamed>'; }

    const key: unknown = member.key;
    if (!TypeGuards.isObject(key)) { return '<unnamed>'; }

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
    return TypeGuards.isObject(rawNode) ? rawNode.parent : undefined;
  }
}

// json-schema-uninexpressible: aggregate of ad-hoc AST-derived facts (a possibly-null raw AST node and a
// function-flags-derived boolean), not a domain shape this package owns or serializes
type AncestorInfoType = {
  readonly 'hasTypeParameterAncestor': boolean;
  readonly 'interfaceName': string;
  readonly 'owningMember': unknown;
};

/**
 * Collects all three ancestor-derived facts (type-parameter presence, owning member,
 * interface name) in a single walk up the parent chain, instead of three independent
 * walks over the same ancestor chain per matched node.
 */
class AncestorInfo {
  static collect(rawNode: unknown): AncestorInfoType {
    let hasTypeParameterAncestor = false;
    let owningMember: unknown = null;
    let owningMemberResolved = false;
    let interfaceName = '<unnamed>';

    let current: unknown = Parent.get(rawNode);

    while (TypeGuards.isObject(current)) {
      const nodeType = NodeType.get(current);

      if (nodeType === 'TSTypeParameter') {
        hasTypeParameterAncestor = true;
      }

      if (
        !owningMemberResolved
        && (
          nodeType === 'TSPropertySignature'
          || nodeType === 'TSMethodSignature'
          || nodeType === 'TSIndexSignature'
        )
      ) {
        owningMember = current;
        owningMemberResolved = true;
      }

      if (!owningMemberResolved && (nodeType === 'TSInterfaceBody' || nodeType === 'TSInterfaceDeclaration')) {
        owningMemberResolved = true;
      }

      if (nodeType === 'TSInterfaceDeclaration') {
        const idNode: unknown = current.id;
        if (TypeGuards.isObject(idNode)) {
          const name: unknown = idNode.name;
          interfaceName = typeof name === 'string' ? name : '<unnamed>';
        }
        break;
      }

      current = Parent.get(current);
    }

    return {
      'hasTypeParameterAncestor': hasTypeParameterAncestor,
      'interfaceName': interfaceName,
      'owningMember': owningMember
    };
  }
}

export const interfacesComposeNamedTypes: Rule.RuleModule = {
  'create': (context) => {
    const onTSInterfaceDeclarationTSTypeLiteral = (node: Rule.Node): void => {
      const ancestorInfo = AncestorInfo.collect(node);
      if (ancestorInfo.hasTypeParameterAncestor) { return; }

      const { interfaceName, owningMember } = ancestorInfo;
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

    return {
      'TSInterfaceDeclaration TSTypeLiteral, TSInterfaceDeclaration TSMappedType': onTSInterfaceDeclarationTSTypeLiteral
    };
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
