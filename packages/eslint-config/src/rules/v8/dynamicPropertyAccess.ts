import type { Rule } from 'eslint';
import type ts from 'typescript';

import { Predicates } from '#runtime';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import {
  INDEXED_COLLECTION_NAMES, MESSAGE, REFLECT_SET_METHODS, REFLECT_SET_OWNERS, RULE_NAME, TRUST_BOUNDARY_MEMBERS, TRUST_BOUNDARY_OWNER, TRUST_BOUNDARY_SOURCE_SUFFIX
} from './constants/DynamicPropertyAccessConstants.js';

// See docs/eslint/rules/v8/dynamic-property-access.md for the measured rationale.

class KeyClassification {
  /** A key V8 resolves statically: a string/numeric literal (folds to `GetNamedProperty`, identical to dot access) or a well-known symbol (a compile-time constant with no alternative spelling). */
  public static isStaticKey(property: unknown): boolean {
    const nodeType = AstHelpers.getNodeType(property);

    if (nodeType === 'Literal') {
      return true;
    }

    if (nodeType !== 'MemberExpression' || !Predicates.isRecord(property)) {
      return false;
    }

    const result = AstHelpers.getIdentifierName(property.object) === 'Symbol';

    return result;
  }
}

class ReceiverClassification {
  /** True when every meaningful constituent of `type` is an indexed collection (element access goes to the elements store, not the hidden class); union-aware, so `readonly number[] | undefined` still matches. */
  public static isIndexedCollection(type: ts.Type, checker: ts.TypeChecker): boolean {
    const constituents = type.isUnion() ? type.types : [type];
    const constituentCount = constituents.length;
    let sawCollection = false;

    for (let index = 0; index < constituentCount; index += 1) {
      const constituent = constituents[index];

      if (constituent === undefined) {
        continue;
      }
      if (ReceiverClassification.#isNullish(constituent, checker)) {
        continue;
      }
      if (!ReceiverClassification.#isSingleIndexedCollection(constituent, checker)) {
        return false;
      }
      sawCollection = true;
    }

    return sawCollection;
  }

  static #isSingleIndexedCollection(type: ts.Type, checker: ts.TypeChecker): boolean {
    if (checker.isArrayType(type) || checker.isTupleType(type)) {
      return true;
    }

    const name = ReceiverClassification.#symbolName(type, checker);

    if (name === undefined) {
      return false;
    }

    const result = INDEXED_COLLECTION_NAMES.has(name) || name === 'String';

    return result;
  }

  static #isNullish(type: ts.Type, checker: ts.TypeChecker): boolean {
    const text = checker.typeToString(type);
    const result = text === 'undefined' || text === 'null';

    return result;
  }

  static #symbolName(type: ts.Type, checker: ts.TypeChecker): string | undefined {
    const direct = type.getSymbol()?.getName();

    if (direct !== undefined) {
      return direct;
    }

    const result = checker.getApparentType(type).getSymbol()
      ?.getName();

    return result;
  }
}

class PropertyOperation {
  /** True when this computed access WRITES to the receiver: an assignment target, an update (`o[k]++`), or a `delete`. Everything else is a read. */
  public static isWrite(node: Rule.Node): boolean {
    const parent: Rule.Node | undefined = node.parent ?? undefined;

    if (parent === undefined) {
      return false;
    }

    if (parent.type === 'AssignmentExpression') {
      const result = AstHelpers.getNodeProperty(parent, 'left') === node;
      return result;
    }

    if (parent.type === 'UpdateExpression') {
      const result = AstHelpers.getNodeProperty(parent, 'argument') === node;
      return result;
    }

    if (parent.type === 'UnaryExpression') {
      const result = AstHelpers.getNodeProperty(parent, 'operator') === 'delete' && AstHelpers.getNodeProperty(parent, 'argument') === node;
      return result;
    }

    const result = PropertyOperation.#isDestructuringTarget(parent, node);

    return result;
  }

  // A destructuring target: `[o[k]] = xs` / `({ a: o[k] } = obj)`.
  static #isDestructuringTarget(parent: Rule.Node, node: Rule.Node): boolean {
    const result = parent.type === 'ArrayPattern' || parent.type === 'ObjectPattern' || parent.type === 'Property' && AstHelpers.getNodeProperty(parent, 'value') === node && PropertyOperation.#inPattern(parent);

    return result;
  }

  static #inPattern(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node.parent ?? undefined;

    while (current !== undefined) {
      if (current.type === 'ObjectPattern' || current.type === 'ArrayPattern') {
        return true;
      }
      if (current.type === 'AssignmentExpression' || current.type === 'VariableDeclarator') {
        return false;
      }
      current = current.parent ?? undefined;
    }

    return false;
  }
}

class TrustBoundaryClassification {
  /** True when `node` sits inside the resolved declaration of the boundary primitive's write — a same-named local class cannot spoof this, since identity is resolved through the checker, not the linted file's path. */
  public static isPrimitiveWrite(node: Rule.Node, context: Rule.RuleContext): boolean {
    const methodKey = TrustBoundaryClassification.#enclosingMethodKey(node);

    if (methodKey === undefined) {
      return false;
    }

    const result = CallIdentity.isDeclarationIdentity(
      methodKey,
      context,
      TRUST_BOUNDARY_OWNER,
      TRUST_BOUNDARY_MEMBERS,
      TRUST_BOUNDARY_SOURCE_SUFFIX
    );

    return result;
  }

  static #enclosingMethodKey(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | undefined = node.parent ?? undefined;

    while (current !== undefined) {
      if (current.type === 'MethodDefinition') {
        const key = AstHelpers.getNodeProperty(current, 'key');

        if (AstHelpers.isNode(key)) {
          return key;
        }
      }
      current = current.parent ?? undefined;
    }

    return undefined;
  }
}

export const dynamicPropertyAccess: Rule.RuleModule = {
  'create': (context) => {
    const reportUnlessIndexedCollection = (node: Rule.Node, receiverArg: unknown): void => {
      const servicesUnknown: unknown = context.sourceCode.parserServices;

      if (!AstHelpers.hasTypeServices(servicesUnknown)) {
        return;
      }

      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(receiverArg);

      if (tsNode === undefined) {
        return;
      }

      const checker = servicesUnknown.program.getTypeChecker();
      const receiverType = checker.getTypeAtLocation(tsNode);

      if (ReceiverClassification.isIndexedCollection(receiverType, checker)) {
        return;
      }

      context.report({
        'messageId': 'forbidden',
        'node': node
      });
    };

    const onMemberExpression = (node: Rule.Node): void => {
      if (!Predicates.isRecord(node)) {
        return;
      }
      if (node.computed !== true) {
        return;
      }
      if (KeyClassification.isStaticKey(node.property)) {
        return;
      }
      if (!PropertyOperation.isWrite(node)) {
        return;
      }
      if (TrustBoundaryClassification.isPrimitiveWrite(node, context)) {
        return;
      }

      reportUnlessIndexedCollection(node, node.object);
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!CallIdentity.isBuiltinCall(node, context, REFLECT_SET_METHODS, REFLECT_SET_OWNERS)) {
        return;
      }
      if (!Predicates.isRecord(node)) {
        return;
      }

      const callArguments = node.arguments;
      const [targetArg, keyArg] = Predicates.isArray(callArguments) ? callArguments : [];

      if (targetArg === undefined || KeyClassification.isStaticKey(keyArg)) {
        return;
      }
      if (TrustBoundaryClassification.isPrimitiveWrite(node, context)) {
        return;
      }

      reportUnlessIndexedCollection(node, targetArg);
    };

    return {
      'CallExpression': onCallExpression,
      'MemberExpression[computed=true]': onMemberExpression
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
