import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types/browser';
import {
  type InterfaceDeclaration,
  isIndexedAccessTypeNode,
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isPropertySignature,
  isUnionTypeNode,
  type Node,
  type Program,
  type TypeChecker,
  type TypeNode
} from 'typescript';

import { TypeContractClassification } from './shared/TypeContractClassification.js';

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!Predicates.isRecord(program) || !Predicates.isRecord(nodeMap)) { return false; }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
    return result;
  }
}

class NodeType {
  public static get(rawNode: unknown): string {
    if (!Predicates.isRecord(rawNode)) { return ''; }

    const nodeType = rawNode.type;
    const result = typeof nodeType === 'string' ? nodeType : '';
    return result;
  }
}

class Member {
  public static getName(member: unknown): string {
    if (!Predicates.isRecord(member)) { return '<unnamed>'; }

    const key = member.key;
    if (!Predicates.isRecord(key)) { return '<unnamed>'; }

    if (key.type === 'Identifier') {
      const name = key.name;
      const result = typeof name === 'string' && name.length > 0 ? name : '<unnamed>';
      return result;
    }

    if (key.type === 'Literal') {
      const value = key.value;
      const result = typeof value === 'string' && value.length > 0 ? value : '<unnamed>';
      return result;
    }

    return '<unnamed>';
  }
}

class Parent {
  public static get(rawNode: unknown): unknown {
    const result = Predicates.isRecord(rawNode) ? rawNode.parent : undefined;
    return result;
  }
}

class InlineDataPortion {
  public static contains(node: Node, classification: TypeContractClassification): boolean {
    if (classification.isInlinePureDataPortion(node)) { return true; }

    const children = node.getChildren();
    const length = children.length;
    for (let index = 0; index < length; index++) {
      const child = children.at(index);
      if (child !== undefined && InlineDataPortion.contains(child, classification)) { return true; }
    }
    return false;
  }

  public static hasAncestor(
    node: Node,
    boundary: InterfaceDeclaration,
    classification: TypeContractClassification
  ): boolean {
    let current = node.parent;
    while (current !== undefined && current !== boundary) {
      if (classification.isInlinePureDataPortion(current)) { return true; }
      // Mixed callable/data ancestor: no-mixed-callable-shapes owns that diagnostic, not this rule.
      if ((isUnionTypeNode(current) || isIntersectionTypeNode(current)) && classification.mixesCallableAndData(current)) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}

/** Without this, `a: Big['a']` reads to the classifier as inert type-level computation. */
class IndexedAccessResolution {
  public static resolveMemberTypeNode(node: TypeNode, checker: TypeChecker): TypeNode | undefined {
    if (!isIndexedAccessTypeNode(node)) { return undefined; }

    const objectType = checker.getTypeFromTypeNode(node.objectType);
    const indexType = checker.getTypeFromTypeNode(node.indexType);
    if (!indexType.isStringLiteral()) { return undefined; }

    const property = objectType.getProperty(indexType.value);
    if (property === undefined) { return undefined; }

    const declaration = property.valueDeclaration ?? (property.getDeclarations() ?? []).at(0);
    const result = declaration !== undefined && isPropertySignature(declaration) ? declaration.type : undefined;
    return result;
  }
}

namespace AncestorInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'hasTypeParameterConstraintAncestor': { 'type': 'boolean' },
      'interfaceName': { 'type': 'string' }
    },
    'required': ['hasTypeParameterConstraintAncestor', 'interfaceName'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface AncestorInfoInterface {
  readonly 'hasTypeParameterConstraintAncestor': AncestorInfoEntity.Type['hasTypeParameterConstraintAncestor'];
  readonly 'interfaceName': AncestorInfoEntity.Type['interfaceName'];
  readonly 'interfaceNode': unknown;
  readonly 'owningMember': unknown;
}

class AncestorInfo {
  public static collect(rawNode: unknown): AncestorInfoInterface {
    let child = rawNode;
    let current = Parent.get(child);
    let hasTypeParameterConstraintAncestor = false;
    let interfaceName = '<unnamed>';
    let interfaceNode: unknown = null;
    let owningMember: unknown = null;

    while (Predicates.isRecord(current)) {
      const nodeType = NodeType.get(current);

      if (nodeType === 'TSTypeParameter' && current.constraint === child) {
        hasTypeParameterConstraintAncestor = true;
      }

      if (
        owningMember === null
        && (
          nodeType === 'TSPropertySignature'
          || nodeType === 'TSMethodSignature'
          || nodeType === 'TSIndexSignature'
        )
      ) {
        owningMember = current;
      }

      if (nodeType === 'TSInterfaceDeclaration') {
        interfaceNode = current;
        const idNode = current.id;
        if (Predicates.isRecord(idNode)) {
          const name = idNode.name;
          if (typeof name === 'string') { interfaceName = name; }
        }
        break;
      }

      child = current;
      current = Parent.get(current);
    }

    return {
      'hasTypeParameterConstraintAncestor': hasTypeParameterConstraintAncestor,
      'interfaceName': interfaceName,
      'interfaceNode': interfaceNode,
      'owningMember': owningMember
    };
  }
}

export const interfacesComposeNamedTypes: Rule.RuleModule = {
  'create': (context) => {
    const servicesUnknown: unknown = context.sourceCode.parserServices;
    if (!ParserServices.has(servicesUnknown)) { return {}; }

    const classification = TypeContractClassification.forProgram(servicesUnknown.program);
    const checker = servicesUnknown.program.getTypeChecker();

    const visitInlineData = (node: Rule.Node): void => {
      const ancestor = AncestorInfo.collect(node);
      if (ancestor.hasTypeParameterConstraintAncestor) { return; }

      const interfaceDeclaration = servicesUnknown.esTreeNodeToTSNodeMap.get(ancestor.interfaceNode);
      if (interfaceDeclaration === undefined || !isInterfaceDeclaration(interfaceDeclaration)) { return; }
      if (classification.analyzeInterface(interfaceDeclaration).classification === 'pureData') { return; }

      const inlineDeclaration = servicesUnknown.esTreeNodeToTSNodeMap.get(node);
      if (inlineDeclaration === undefined || !classification.isInlinePureDataPortion(inlineDeclaration)) { return; }
      if (InlineDataPortion.hasAncestor(inlineDeclaration, interfaceDeclaration, classification)) { return; }

      context.report({
        'data': {
          'interfaceName': ancestor.interfaceName,
          'memberName': ancestor.owningMember === null ? '<unnamed>' : Member.getName(ancestor.owningMember)
        },
        'messageId': 'inlineObjectInInterface',
        'node': node
      });
    };

    const visitDataMember = (node: Rule.Node): void => {
      const ancestor = AncestorInfo.collect(node);
      if (ancestor.hasTypeParameterConstraintAncestor) { return; }

      const interfaceDeclaration = servicesUnknown.esTreeNodeToTSNodeMap.get(ancestor.interfaceNode);
      if (interfaceDeclaration === undefined || !isInterfaceDeclaration(interfaceDeclaration)) { return; }
      if (classification.analyzeInterface(interfaceDeclaration).classification === 'pureData') { return; }

      const member = servicesUnknown.esTreeNodeToTSNodeMap.get(node);
      if (
        member === undefined
        || (!isPropertySignature(member) && !isIndexSignatureDeclaration(member))
        || member.type === undefined
      ) {
        return;
      }

      const memberType: TypeNode = member.type;
      if (classification.isBrandDeclarationMember(member)) { return; }
      if (classification.isInlineContractPortion(member.parent)) { return; }
      if (InlineDataPortion.hasAncestor(member, interfaceDeclaration, classification)) { return; }

      // T or Big['a'] would otherwise launder an inline pure-data shape past the checks below.
      const resolvedConstraint = classification.resolveTypeParameterConstraint(memberType);
      const resolvedIndexedAccess = isIndexedAccessTypeNode(memberType)
        ? IndexedAccessResolution.resolveMemberTypeNode(memberType, checker)
        : undefined;
      const substituted = resolvedConstraint ?? resolvedIndexedAccess;

      if (substituted !== undefined) {
        // visitInlineData exempts a type parameter's own constraint literal from self-flagging;
        // deferring to InlineDataPortion.contains here would silently drop this diagnostic.
        if (classification.isInlinePureDataPortion(substituted) || classification.requiresNamedDataComposition(substituted)) {
          context.report({
            'data': {
              'interfaceName': ancestor.interfaceName,
              'memberName': Member.getName(node)
            },
            'messageId': 'inlineObjectInInterface',
            'node': node
          });
        }
        return;
      }

      if (InlineDataPortion.contains(memberType, classification)) { return; }
      if (!classification.requiresNamedDataComposition(memberType)) { return; }

      context.report({
        'data': {
          'interfaceName': ancestor.interfaceName,
          'memberName': Member.getName(node)
        },
        'messageId': 'inlineObjectInInterface',
        'node': node
      });
    };

    return {
      'TSInterfaceDeclaration TSIndexSignature': visitDataMember,
      'TSInterfaceDeclaration TSMappedType': visitInlineData,
      'TSInterfaceDeclaration TSPropertySignature': visitDataMember,
      'TSInterfaceDeclaration TSTypeLiteral': visitInlineData
    };
  },
  'meta': {
    'docs': {
      'description':
        'Runtime and access-contract interfaces compose pure-data portions from named schema-derived entity types.'
    },
    'messages': {
      'inlineObjectInInterface':
        "Interface '{{interfaceName}}' uses inline pure data at member '{{memberName}}'. Extract that shape to a schema-derived entity and reference its named Type from the interface."
    },
    'schema': [],
    'type': 'problem'
  }
};
