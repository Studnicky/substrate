import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import { LoopContext } from '../shared/LoopContext.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  MESSAGE, OBJECT_PROTOTYPE_API_METHODS, OBJECT_PROTOTYPE_API_OWNERS, REFLECT_CALLEE_NAMES, RULE_NAME
} from './constants/PrototypeModificationConstants.js';

// TWO FIXES: a resolved-identity gap (`Object.assign` evaded the rule), and a scope gap
// (one-shot, pre-instantiation prototype setup was falsely flagged alongside the genuinely
// dangerous post-instantiation case).
//
// GAP 1 — `Object.assign(Foo.prototype, { bar() {} })` evaded every check. The prior
// callee allowlist (`DEFINE_CALLEE_NAMES`) listed `defineProperty`/`defineProperties`/
// `setPrototypeOf` but not `assign`, even though `Object.assign` mutates its first
// argument's own properties exactly like `Object.defineProperties` does. Fixed by resolving
// the callee through `CallIdentity` (adds `assign`) instead of a hand-maintained name list —
// `Object['assign'](...)` and any other spelling now resolve the same way. `Reflect.set` /
// `Reflect.setPrototypeOf` stay on direct callee-shape matching: verified via
// `checker.getResolvedSignature()` that `Reflect`'s members are declared in a TypeScript
// `namespace` (`lib.es2015.reflect.d.ts`), so `CallIdentity`'s owner-name resolution — which
// reads `declaration.parent.name`, correct for interface-declared methods like
// `ObjectConstructor.assign` — finds no name for a namespace member and always returns
// `false`. That is a real limitation of the shared, stable `CallIdentity` module, not
// something to work around by editing it.
//
// GAP 2 — a one-shot prototype setup pattern was flagged even though it is measurably
// harmless:
//
//   function Foo() { this.a = 1; }
//   Foo.prototype.bar = function () { return this.a; };   // <- flagged before, harmless
//
// The actual, measured hazard is POST-INSTANTIATION mutation — changing a prototype AFTER
// instances already exist and hot code has already compiled against them:
//
//   node --allow-natives-syntax
//   function Foo() { this.a = 1; }
//   Foo.prototype.bar = function () { return this.a; };
//   const instance = new Foo();
//   function hot(o) { return o.bar(); }
//   for (let i = 0; i < 20000; i++) { hot(instance); }
//   %OptimizeFunctionOnNextCall(hot); hot(instance);
//   %GetOptimizationStatus(hot).toString(2)                 -> '1010001'  (optimized bit set)
//   Foo.prototype.baz = function () { return this.a + 1; }; // <- mutation AFTER optimization
//   %GetOptimizationStatus(hot).toString(2)                 -> '1'        (optimized bit CLEARED)
//
// `hot` is deoptimized by the prototype mutation alone — a direct, observable consequence,
// not a guess. (At 5,000,000 subsequent calls the AMORTIZED cost washes out — V8
// re-optimizes `hot` again within the loop — so the measured hazard here is the one-time
// recompilation stall, not a sustained throughput loss; that stall matters most for
// latency-sensitive or startup-sensitive paths. See scratchpad/bench_prototypeModification.js.)
//
// A one-shot setup at module top level, before any instance exists and before any code has
// had a chance to compile against the prototype, cannot trigger that invalidation — there is
// nothing yet to invalidate. So this rule now exempts a prototype modification ONLY when it
// is PROVABLY one-shot: NOT nested inside any function or loop. `LoopContext.isPerIteration`
// (shared, stable) answers the loop half of that, including iteration-method callbacks
// (`.forEach`, …) that a raw loop-keyword walk would miss; a plain (non-loop) function
// nesting is checked separately, because a prototype mutation inside an ordinary helper that
// simply gets called more than once is equally unproven to run only once. Resolves toward
// the stricter side when uncertain — matches `computedClassProperties`'s equivalent
// "recurring scope" check for the analogous class-factory hazard.
//
// PAIRED RULE: `define-property`'s redefinition check — the same "not proven to run exactly
// once, so it can diverge shape across calls/instances" reasoning, applied to a plain
// object's own properties instead of a prototype.

class NodeAccess {
  public static asObject(value: unknown): Record<string, unknown> | undefined {
    const result = ObjectGuard.isObject(value) ? value : undefined;

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
  // `Reflect.set` / `Reflect.setPrototypeOf` — see the module comment for why this stays
  // syntactic rather than `CallIdentity`-resolved.
  public static isReflectPrototypeApi(callee: Record<string, unknown>): boolean {
    if (NodeAccess.typeOf(callee) !== 'MemberExpression' || callee.computed === true) {
      return false;
    }
    const object = NodeAccess.asObject(callee.object);
    const property = NodeAccess.asObject(callee.property);

    if (object === undefined || property === undefined) {
      return false;
    }
    if (object.type !== 'Identifier' || object.name !== 'Reflect') {
      return false;
    }

    const result = property.type === 'Identifier' && typeof property.name === 'string' && REFLECT_CALLEE_NAMES.has(property.name);

    return result;
  }

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
  /**
   * True when `node` is PROVABLY one-shot: not nested in any loop (including a per-element
   * iteration-method callback, via `LoopContext`) and not nested in any function at all. A
   * module-top-level statement immediately following a constructor/class declaration is the
   * only shape that qualifies — proven harmless in the module comment above.
   */
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
      const raw = node as unknown as Record<string, unknown>;
      const left = NodeAccess.asObject(raw.left);

      if (left === undefined) {
        return;
      }

      // `left` is the assignment target: `Foo.prototype = value` (whole-prototype
      // reassignment, `left` IS the `X.prototype` member expression) / `Foo.prototype.bar = value`
      // (property-on-prototype mutation) / `obj.__proto__ = value`.
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
      const raw = node as unknown as Record<string, unknown>;
      const callee = NodeAccess.asObject(raw.callee);

      if (callee === undefined) {
        return;
      }

      const isForbiddenApi = CallIdentity.isBuiltinCall(node, context, OBJECT_PROTOTYPE_API_METHODS, OBJECT_PROTOTYPE_API_OWNERS)
        || CalleeShape.isReflectPrototypeApi(callee);

      if (!isForbiddenApi) {
        return;
      }

      if (CalleeShape.hasPrototypeArgument(raw.arguments) && !RecurringScope.isProvablyOneShot(node, context)) {
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
