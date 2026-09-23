import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';
import {
  IndexKind,
  type Type,
  type TypeChecker,
  TypeFlags
} from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';

// Deleting an own property drops the object out of fast properties for any shape; see
// docs/eslint/rules/v8/delete-property.md for measurements, exemption sites, and the type boundary.

class DeletionTarget {
  /** The object being deleted FROM — `obj` in `delete obj.x` / `delete obj?.x`. */
  public static fromDeleteMemberExpression(node: Rule.Node): Rule.Node | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    const argument = node.argument;

    if (!Predicates.isRecord(argument)) {
      return undefined;
    }

    if (argument.type === 'MemberExpression') {
      const result = Predicates.isRecord(argument.object) ? argument.object as unknown as Rule.Node : undefined;

      return result;
    }
    if (argument.type === 'ChainExpression') {
      const expression = argument.expression;

      if (!Predicates.isRecord(expression) || expression.type !== 'MemberExpression') {
        return undefined;
      }

      const result = Predicates.isRecord(expression.object) ? expression.object as unknown as Rule.Node : undefined;

      return result;
    }

    return undefined;
  }

  /** The object being deleted FROM — `obj` in `Reflect.deleteProperty(obj, 'x')`. */
  public static fromReflectDeletePropertyCall(node: Rule.Node): Rule.Node | undefined {
    if (!Predicates.isRecord(node)) {
      return undefined;
    }

    const argumentList = node.arguments;

    if (!Predicates.isArray(argumentList)) {
      return undefined;
    }

    const target = argumentList.at(0);
    const result = Predicates.isRecord(target) ? target as unknown as Rule.Node : undefined;

    return result;
  }
}

class DynamicShapeClassification {
  // Union-aware, matching dynamic-property-access's ReceiverClassification: `Record<string, T> | undefined` still counts.
  public static isDynamicallyShaped(type: Type, checker: TypeChecker): boolean {
    const constituents = type.isUnion() ? type.types : [type];
    const constituentCount = constituents.length;
    let sawDynamicShape = false;

    for (let index = 0; index < constituentCount; index += 1) {
      const constituent = constituents[index];

      if (constituent === undefined) {
        continue;
      }
      if (DynamicShapeClassification.#isNullish(constituent, checker)) {
        continue;
      }
      if (!DynamicShapeClassification.#isSingleDynamicallyShapedType(constituent, checker)) {
        return false;
      }
      sawDynamicShape = true;
    }

    return sawDynamicShape;
  }

  static #isSingleDynamicallyShapedType(type: Type, checker: TypeChecker): boolean {
    if ((type.flags & TypeFlags.NonPrimitive) !== 0) {
      return true;
    }

    const stringIndex = checker.getIndexInfoOfType(type, IndexKind.String);
    const numberIndex = checker.getIndexInfoOfType(type, IndexKind.Number);
    const result = stringIndex !== undefined || numberIndex !== undefined;

    return result;
  }

  static #isNullish(type: Type, checker: TypeChecker): boolean {
    const text = checker.typeToString(type);
    const result = text === 'undefined' || text === 'null';

    return result;
  }
}

export const deleteProperty: Rule.RuleModule = {
  'create': (context) => {
    const reportUnlessDynamicallyShaped = (node: Rule.Node, target: Rule.Node | undefined): void => {
      if (target !== undefined) {
        const servicesUnknown: unknown = context.sourceCode.parserServices;

        if (AstHelpers.hasTypeServices(servicesUnknown)) {
          const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(target);

          if (tsNode !== undefined) {
            const checker = servicesUnknown.program.getTypeChecker();
            const targetType = checker.getTypeAtLocation(tsNode);

            if (DynamicShapeClassification.isDynamicallyShaped(targetType, checker)) {
              return;
            }
          }
        }
      }

      context.report({
        'messageId': 'forbidden',
        'node': node
      });
    };

    const onDeleteMemberExpression = (node: Rule.Node): void => {
      reportUnlessDynamicallyShaped(node, DeletionTarget.fromDeleteMemberExpression(node));
    };

    const onReflectDeletePropertyCall = (node: Rule.Node): void => {
      reportUnlessDynamicallyShaped(node, DeletionTarget.fromReflectDeletePropertyCall(node));
    };

    return {
      'CallExpression[callee.object.name="Reflect"][callee.property.name="deleteProperty"]': onReflectDeletePropertyCall,
      'UnaryExpression[operator="delete"][argument.type="ChainExpression"][argument.expression.type="MemberExpression"]': onDeleteMemberExpression,
      'UnaryExpression[operator="delete"][argument.type="MemberExpression"]': onDeleteMemberExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'delete on member expressions is forbidden. It breaks V8 optimizations.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/deleteProperty: delete on member expressions is forbidden. It breaks V8 optimizations.' },
    'schema': [],
    'type': 'problem'
  }
};
