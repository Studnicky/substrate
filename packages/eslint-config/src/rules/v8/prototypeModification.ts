import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { DEFINE_CALLEE_NAMES, REFLECT_CALLEE_NAMES } from './constants/PrototypeModificationConstants.js';

class NodeAccess {
  public static asObject(value: unknown): Record<string, unknown> | undefined {
    return ObjectGuard.isObject(value) ? value : undefined;
  }

  public static typeOf(value: unknown): string | undefined {
    const node = NodeAccess.asObject(value);
    if (node === undefined) { return undefined; }
    const type = node.type;
    return typeof type === 'string' ? type : undefined;
  }

  public static propertyName(memberExpression: Record<string, unknown>): string | undefined {
    // Handles both `X.prototype` (Identifier property) and `X["prototype"]` (computed Literal property).
    const property = NodeAccess.asObject(memberExpression.property);
    if (property === undefined) { return undefined; }

    if (memberExpression.computed !== true) {
      return property.type === 'Identifier' && typeof property.name === 'string' ? property.name : undefined;
    }

    return property.type === 'Literal' && typeof property.value === 'string' ? property.value : undefined;
  }
}

class PrototypeShape {
  // Returns true if `node` is `<anything>.prototype` / `<anything>["prototype"]`.
  public static isPrototypeMemberExpression(node: unknown): boolean {
    const memberExpression = NodeAccess.asObject(node);
    if (memberExpression === undefined || NodeAccess.typeOf(memberExpression) !== 'MemberExpression') { return false; }

    return NodeAccess.propertyName(memberExpression) === 'prototype';
  }

  // `Foo.prototype = value` — whole-prototype reassignment. `left` IS the `X.prototype` member expression.
  public static isWholePrototypeAssignment(left: Record<string, unknown>): boolean {
    const result = PrototypeShape.isPrototypeMemberExpression(left);
    return result;
  }

  // `Foo.prototype.bar = value` — property-on-prototype mutation. `left.object` is the `X.prototype`
  // member expression (`left` itself is `<X.prototype>.bar`).
  public static isPrototypePropertyAssignment(left: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(left) !== 'MemberExpression') { return false; }
    return PrototypeShape.isPrototypeMemberExpression(left.object);
  }

  // `obj.__proto__ = value`
  public static isDunderProtoAssignment(left: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(left) !== 'MemberExpression') { return false; }
    return NodeAccess.propertyName(left) === '__proto__';
  }
}

class CalleeShape {
  // `Object.defineProperty` / `Object.defineProperties` / `Object.setPrototypeOf`
  public static isObjectPrototypeApi(callee: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(callee) !== 'MemberExpression' || callee.computed === true) { return false; }
    const object = NodeAccess.asObject(callee.object);
    const property = NodeAccess.asObject(callee.property);
    if (object === undefined || property === undefined) { return false; }
    if (object.type !== 'Identifier' || object.name !== 'Object') { return false; }
    return property.type === 'Identifier' && typeof property.name === 'string' && DEFINE_CALLEE_NAMES.has(property.name);
  }

  // `Reflect.set` / `Reflect.setPrototypeOf`
  public static isReflectPrototypeApi(callee: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(callee) !== 'MemberExpression' || callee.computed === true) { return false; }
    const object = NodeAccess.asObject(callee.object);
    const property = NodeAccess.asObject(callee.property);
    if (object === undefined || property === undefined) { return false; }
    if (object.type !== 'Identifier' || object.name !== 'Reflect') { return false; }
    return property.type === 'Identifier' && typeof property.name === 'string' && REFLECT_CALLEE_NAMES.has(property.name);
  }

  // Any argument that resolves to `<X>.prototype` shaped access.
  public static hasPrototypeArgument(args: unknown): boolean {
    if (!Array.isArray(args)) { return false; }
    return args.some((arg: unknown) => { const result = PrototypeShape.isPrototypeMemberExpression(arg); return result; });
  }
}

export const prototypeModification: Rule.RuleModule = {
  'create': (context) => {
    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      const raw = node as unknown as Record<string, unknown>;
      const left = NodeAccess.asObject(raw.left);
      if (left === undefined) { return; }

      const isForbidden = PrototypeShape.isWholePrototypeAssignment(left)
        || PrototypeShape.isPrototypePropertyAssignment(left)
        || PrototypeShape.isDunderProtoAssignment(left);

      if (isForbidden) {
        context.report({ 'messageId': 'prototypeModification', 'node': node });
      }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const raw = node as unknown as Record<string, unknown>;
      const callee = NodeAccess.asObject(raw.callee);
      if (callee === undefined) { return; }

      const isForbiddenApi = CalleeShape.isObjectPrototypeApi(callee) || CalleeShape.isReflectPrototypeApi(callee);
      if (!isForbiddenApi) { return; }

      if (CalleeShape.hasPrototypeArgument(raw.arguments)) {
        context.report({ 'messageId': 'prototypeModification', 'node': node });
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'CallExpression': onCallExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow prototype modification: whole-prototype reassignment, property-on-prototype mutation, __proto__ assignment, and Object.defineProperty/Object.setPrototypeOf/Reflect.set/Reflect.setPrototypeOf targeting a prototype.',
      'recommended': false
    },
    'messages': { 'prototypeModification': 'v8Optimization/prototypeModification: Modifying prototype breaks V8 optimizations.' },
    'schema': [],
    'type': 'problem'
  }
};
