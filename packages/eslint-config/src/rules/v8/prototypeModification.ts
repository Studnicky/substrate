import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import { CallIdentity } from '../shared/CallIdentity.js';
import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  MESSAGE, OBJECT_PROTOTYPE_API_METHODS, OBJECT_PROTOTYPE_API_OWNERS, REFLECT_PROTOTYPE_API_METHODS, REFLECT_PROTOTYPE_API_OWNERS, RULE_NAME
} from './constants/PrototypeModificationConstants.js';

// Exemption rationale and the %GetOptimizationStatus proof: docs/eslint/rules/v8/prototype-modification.md.

class NodeAccess {
  public static asObject(value: unknown): Record<string, unknown> | undefined {
    const result = Predicates.isRecord(value) ? value : undefined;

    return result;
  }

  public static typeOf(value: unknown): string | undefined {
    const node = NodeAccess.asObject(value);

    if (node === undefined) {
      return undefined;
    }
    const type = node.type;

    const result = typeof type === 'string' ? type : undefined;

    return result;
  }

  public static propertyName(memberExpression: Record<string, unknown>): string | undefined {
    // Handles both `X.prototype` (Identifier property) and `X["prototype"]` (computed Literal property).
    const property = NodeAccess.asObject(memberExpression.property);

    if (property === undefined) {
      return undefined;
    }

    if (memberExpression.computed !== true) {
      const result = property.type === 'Identifier' && typeof property.name === 'string' ? property.name : undefined;

      return result;
    }

    const result = property.type === 'Literal' && typeof property.value === 'string' ? property.value : undefined;

    return result;
  }
}

class PrototypeShape {
  // Returns true if `node` is `<anything>.prototype` / `<anything>["prototype"]`.
  public static isPrototypeMemberExpression(node: unknown): boolean {
    const memberExpression = NodeAccess.asObject(node);

    if (memberExpression === undefined || NodeAccess.typeOf(memberExpression) !== 'MemberExpression') {
      return false;
    }

    const result = NodeAccess.propertyName(memberExpression) === 'prototype';

    return result;
  }

  // `Foo.prototype.bar = value` — property-on-prototype mutation. `left.object` is the `X.prototype`
  // member expression (`left` itself is `<X.prototype>.bar`).
  public static isPrototypePropertyAssignment(left: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(left) !== 'MemberExpression') {
      return false;
    }

    const result = PrototypeShape.isPrototypeMemberExpression(left.object);

    return result;
  }

  // `obj.__proto__ = value`
  public static isDunderProtoAssignment(left: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(left) !== 'MemberExpression') {
      return false;
    }

    const result = NodeAccess.propertyName(left) === '__proto__';

    return result;
  }
}

class CalleeShape {
  // Any argument that resolves to `<X>.prototype` shaped access.
  public static hasPrototypeArgument(argumentList: unknown): boolean {
    if (!Array.isArray(argumentList)) {
      return false;
    }

    const argumentListLength = argumentList.length;

    for (let index = 0; index < argumentListLength; index += 1) {
      if (PrototypeShape.isPrototypeMemberExpression(argumentList.at(index))) {
        return true;
      }
    }

    return false;
  }
}

class RecurringScope {
  // PROVABLY one-shot: no enclosing loop (LoopContext, including iteration-method callbacks) and no enclosing function.
  public static isProvablyOneShot(node: Rule.Node, context: Rule.RuleContext): boolean {
    if (LoopContext.isPerIteration(node, context)) {
      return false;
    }

    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) {
        return false;
      }
      current = current.parent;
    }

    return true;
  }
}

export const prototypeModification: Rule.RuleModule = {
  'create': (context) => {
    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      const left = NodeAccess.asObject(node.left);

      if (left === undefined) {
        return;
      }

      // `Foo.prototype = value` has `left` itself as the `X.prototype` member expression;
      // the other two forbidden forms wrap a nested member/prototype access.
      const isForbidden = PrototypeShape.isPrototypeMemberExpression(left)
        || PrototypeShape.isPrototypePropertyAssignment(left)
        || PrototypeShape.isDunderProtoAssignment(left);

      if (isForbidden && !RecurringScope.isProvablyOneShot(node, context)) {
        context.report({
          'messageId': 'prototypeModification', 'node': node
        });
      }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const isForbiddenApi = CallIdentity.isBuiltinCall(node, context, OBJECT_PROTOTYPE_API_METHODS, OBJECT_PROTOTYPE_API_OWNERS)
        || CallIdentity.isBuiltinCall(node, context, REFLECT_PROTOTYPE_API_METHODS, REFLECT_PROTOTYPE_API_OWNERS);

      if (!isForbiddenApi) {
        return;
      }

      if (CalleeShape.hasPrototypeArgument(node.arguments) && !RecurringScope.isProvablyOneShot(node, context)) {
        context.report({
          'messageId': 'prototypeModification', 'node': node
        });
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'CallExpression': onCallExpression
    };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'prototypeModification': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
