import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import {
  isIndexSignatureDeclaration,
  isInterfaceDeclaration,
  isIntersectionTypeNode,
  isPropertySignature,
  isTypeAliasDeclaration,
  isUnionTypeNode,
  type Node,
  type Program
} from 'typescript';

import { ObjectGuard } from './shared/ObjectGuard.js';
import { TypeContractClassification } from './shared/TypeContractClassification.js';

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': ReadonlyMap<object, Node>;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!ObjectGuard.isObject(value.esTreeNodeToTSNodeMap) || typeof value.esTreeNodeToTSNodeMap.get !== 'function') {
      return false;
    }
    const result = ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';
    return result;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    const result = ParserServicesGuard.hasTypeInformation(services) ? services : undefined;
    return result;
  }
}

namespace DeclarationLocationEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'location': { 'type': 'string' },
      'name': { 'type': 'string' }
    },
    'required': ['location', 'name'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface DeclarationLocationInterface {
  readonly 'location': DeclarationLocationEntity.Type['location'];
  readonly 'name': DeclarationLocationEntity.Type['name'];
}

/**
 * Describes where a mixed union or intersection sits relative to the nearest enclosing named
 * type alias or interface declaration, walking outward through property signatures and index
 * signatures to build a dotted member path. A node with no enclosing named declaration (an
 * inline annotation on a parameter or variable, for example) reports itself generically.
 */
class DeclarationLocation {
  public static describe(node: Node): DeclarationLocationInterface {
    const segments: string[] = [];
    let child: Node = node;
    let current: Node | undefined = child.parent;

    while (current !== undefined) {
      if (isPropertySignature(current) && current.type === child) {
        segments.unshift(current.name.getText());
      } else if (isIndexSignatureDeclaration(current) && current.type === child) {
        segments.unshift('[index]');
      }

      if (isTypeAliasDeclaration(current)) {
        const name = current.name.text;
        return { 'location': segments.length > 0 ? segments.join('.') : name, 'name': name };
      }
      if (isInterfaceDeclaration(current)) {
        const name = current.name.text;
        return { 'location': segments.length > 0 ? segments.join('.') : name, 'name': name };
      }

      child = current;
      current = current.parent;
    }

    return { 'location': 'inline type', 'name': 'inline type' };
  }
}

export const noMixedCallableShapes: Rule.RuleModule = {
  'create': (context) => {
    const services = ContextHelpers.getServices(context);
    const classification = services === undefined
      ? undefined
      : TypeContractClassification.forProgram(services.program);

    const onMixedShapeCandidate = (node: Rule.Node): void => {
      if (classification === undefined || services === undefined) { return; }

      const typeScriptNode = services.esTreeNodeToTSNodeMap.get(node);
      if (typeScriptNode === undefined || (!isUnionTypeNode(typeScriptNode) && !isIntersectionTypeNode(typeScriptNode))) {
        return;
      }
      if (!classification.mixesCallableAndData(typeScriptNode)) { return; }

      const { location, name } = DeclarationLocation.describe(typeScriptNode);
      const sourceFile = typeScriptNode.getSourceFile();
      const evidenceStart = typeScriptNode.getStart(sourceFile);
      const evidenceEnd = typeScriptNode.getEnd();

      context.report({
        'data': { 'location': location, 'name': name },
        'loc': {
          'end': context.sourceCode.getLocFromIndex(evidenceEnd),
          'start': context.sourceCode.getLocFromIndex(evidenceStart)
        },
        'messageId': 'mixedCallableShape'
      });
    };

    return {
      'TSIntersectionType': onMixedShapeCandidate,
      'TSUnionType': onMixedShapeCandidate
    };
  },
  'meta': {
    'docs': {
      'description': 'A single type position is callable or it is data, never both.'
    },
    'messages': {
      'mixedCallableShape':
        "Type '{{name}}' mixes a callable shape with data at '{{location}}'. A declaration is callable or it is data, never both. Split the callable into its own interface and the data into its own schema-derived type."
    },
    'schema': [],
    'type': 'problem'
  }
};
