import type { Rule } from 'eslint';

import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  MESSAGE, RULE_NAME
} from './constants/DefinePropertyConstants.js';

// WHY "BREAKS HIDDEN CLASSES" WAS FALSE FOR DEFINITION, AND WHAT IS TRUE INSTEAD.
//
//   node --allow-natives-syntax
//   function PlainAssign() { this.a = 1; this.b = 2; }
//   function DefinePropertyBuilt() {
//     this.a = 1;
//     Object.defineProperty(this, 'b', { value: 2, writable: true, enumerable: true, configurable: true });
//   }
//   %HasFastProperties(new PlainAssign())          -> true
//   %HasFastProperties(new DefinePropertyBuilt())  -> true
//   %HasFastProperties(new DefinePropertyBuilt() with non-enumerable/non-configurable) -> true
//
// A FRESH property — one never assigned before — stays in fast properties no matter how
// it is installed. The prior message ("Object.defineProperty breaks hidden classes")
// asserted a cost that does not exist for the common case: defining a brand-new property
// once, in the constructor. That premise is retracted; this rule no longer flags it.
//
// What IS measured to break fast properties is REDEFINITION — calling
// `Object.defineProperty` on a property that was already established (by a prior plain
// assignment or a prior `defineProperty` call) earlier in the same function:
//
//   function DataToAccessor() {
//     this.a = 1; this.b = 2;                              // 'b' established as data
//     let _b = this.b;
//     Object.defineProperty(this, 'b', { get() { return _b; }, set(v) { _b = v; } });
//   }
//   %HasFastProperties(new DataToAccessor())  -> false      <-- dictionary mode
//
// Benchmarked at 5,000,000 property reads (median of 7, 3-call warm-up,
// scratchpad/bench_defineProperty.js):
//
//   fast-property read (never redefined)     1.99 ms
//   redefined data -> accessor (dictionary)  31.45 ms       15.8x
//
// A second, independent hazard: redefinition applied NON-UNIFORMLY across instances (a
// conditional branch, or a call made after construction) diverges their hidden-class map
// even when both stay in fast properties:
//
//   function Widget(flag) {
//     this.a = 1; this.b = 2;
//     if (flag) { Object.defineProperty(this, 'b', { value: 99, writable: false, ... }); }
//   }
//   %HaveSameMap(new Widget(false), new Widget(true))  -> false
//
//   const o1 = new Plain(), o2 = new Plain();             // %HaveSameMap -> true
//   Object.defineProperty(o1, 'b', { value: 42, writable: false, ... }); // o1 only
//   %HaveSameMap(o1, o2)                                  -> false        <-- diverged
//
// This is the same megamorphic hazard `conditional-property-assignment` guards against,
// applied to `defineProperty` instead of a plain assignment. Both rules reduce to one
// question: is every instance guaranteed to reach the SAME shape? A `defineProperty` call
// reached only through some branches, or issued after construction on some instances and
// not others, answers no — regardless of whether the descriptor is data or accessor.
//
// A THIRD, separate finding: even a FRESH accessor descriptor (never previously a data
// property) diverges maps across instances:
//
//   function FreshAccessor() {
//     this.a = 1; let _b = 2;
//     Object.defineProperty(this, 'b', { get() { return _b; }, set(v) { _b = v; } });
//   }
//   %HasFastProperties(new FreshAccessor())                 -> true  (still fast — no dict mode)
//   %HaveSameMap(new FreshAccessor(), new FreshAccessor())  -> false
//
// This is not a defineProperty-specific cost — it is the closure-per-instance problem
// (each instance's getter/setter is a distinct function object, so each instance's
// descriptor entry differs). The same divergence happens with `this.method = () => {}`
// in a constructor, with no `defineProperty` involved. This rule still flags EVERY
// accessor descriptor unconditionally, because a `get`/`set` pair captures per-instance
// state in every case measured here — but the underlying mechanism is closures, not
// defineProperty, and a rule targeting closures directly does not exist in this batch.
//
// WHAT THIS RULE DELIBERATELY DOES NOT MATCH: a `defineProperty`/`defineProperties` call
// establishing a property for the FIRST time in this function (no prior assignment, no
// prior defineProperty call on the same key, non-accessor descriptor) — measured fast and
// uniform, see above. Establishment is tracked per ENCLOSING FUNCTION only; a property
// established in one function and redefined in a different one is not connected by this
// rule (proving that connection would require whole-program flow analysis this rule does
// not attempt — same posture as `arrayConcatOutsideLoops`'s `HelperReachability`, which
// stops at what a single-function scan can prove).
//
// PAIRED RULE: `conditional-property-assignment` — same hazard (per-instance shape
// divergence from non-uniform property establishment), different syntax (`this.x = ...`
// vs `Object.defineProperty(this, 'x', ...)`). Change them together.
//
// CALL DETECTION deliberately stays SYNTACTIC (alias/destructure/Reflect tracking below),
// not `CallIdentity`-resolved. `Object.defineProperty` never has a same-named,
// different-behavior user overload the way `Array.prototype.concat` does (the false
// positive `CallIdentity` exists to prevent), so the type-checker dependency buys nothing
// here and would go silent without `projectService` — undesirable for a hidden-class-shape
// rule that should still catch `const O = Object; O.defineProperty(this, key, desc)` in a
// plain JS file with no type services at all.

const TARGET_METHOD_NAMES: ReadonlySet<string> = new Set([
  'defineProperties',
  'defineProperty'
]);

class PropertyKeyName {
  // Resolves a (possibly computed, bracket-notation) member/object-literal-property key to
  // its static string name. Handles `Object.defineProperty` (non-computed Identifier),
  // `Object['defineProperty']` (computed string Literal), AND a non-computed but QUOTED
  // object-literal key (`{ 'defineProperty': fn }`) — the repo's `quote-props: always`
  // convention (`eslint.config.mjs`) makes every object-literal property key a `Literal`
  // even when `computed` is `false`; a resolver that only accepted `Identifier` there would
  // silently fail to resolve real, convention-compliant code (verified: this rule's own
  // `DescriptorClassification`/`Object.defineProperties` map-entry checks missed
  // `{ 'get': () => {...} }` before this fix, using string-quoted keys as this codebase's
  // own convention requires). Returns undefined for anything else (e.g. a truly dynamic
  // key), which correctly falls through to "not matched".
  public static resolve(propertyNode: unknown, computed: boolean): string | undefined {
    if (!ObjectGuard.isObject(propertyNode)) {
      return undefined;
    }

    if (!computed && propertyNode.type === 'Identifier' && typeof propertyNode.name === 'string') {
      return propertyNode.name;
    }

    if (propertyNode.type === 'Literal' && typeof propertyNode.value === 'string') {
      return propertyNode.value;
    }

    return undefined;
  }
}

class AliasRegistry {
  // Local identifier names that resolve to the global `Object` value,
  // seeded with the literal name itself. Grows as `const O = Object;`-style
  // aliases (including alias-of-alias chains) are discovered during the
  // single forward traversal of the program.
  public readonly objectAliases = new Set<string>(['Object']);

  // Local identifier names bound via destructuring `defineProperty`/
  // `defineProperties` off of something already known to resolve to
  // `Object` — e.g. `const { defineProperty } = Object;` or
  // `const { defineProperty: dp } = O;`. A bare call to such a name is
  // equivalent to `Object.defineProperty(...)`.
  public readonly destructuredMethodNames = new Map<string, string>();

  public observeDeclarator(node: unknown): void {
    if (!ObjectGuard.isObject(node)) {
      return;
    }
    const id = node.id;
    const init = node.init;

    if (!ObjectGuard.isObject(id) || !ObjectGuard.isObject(init)) {
      return;
    }
    if (init.type !== 'Identifier' || typeof init.name !== 'string') {
      return;
    }
    if (!this.objectAliases.has(init.name)) {
      return;
    }

    if (id.type === 'Identifier' && typeof id.name === 'string') {
      // `const O = Object;` (or `const O2 = O;`, via a prior alias).
      this.objectAliases.add(id.name);

      return;
    }

    if (id.type === 'ObjectPattern' && Array.isArray(id.properties)) {
      // `const { defineProperty } = Object;` / `const { defineProperty: dp } = O;`
      const properties = id.properties as readonly unknown[];
      const propertiesLength = properties.length;

      for (let index = 0; index < propertiesLength; index += 1) {
        const property = properties.at(index);

        if (!ObjectGuard.isObject(property) || property.type !== 'Property') {
          continue;
        }
        const keyName = PropertyKeyName.resolve(property.key, property.computed === true);

        if (keyName === undefined || !TARGET_METHOD_NAMES.has(keyName)) {
          continue;
        }

        const valueNode = property.value;

        if (ObjectGuard.isObject(valueNode) && valueNode.type === 'Identifier' && typeof valueNode.name === 'string') {
          this.destructuredMethodNames.set(valueNode.name, keyName);
        }
      }
    }
  }
}

class PropertyIdentity {
  /** `this` or a simple identifier's name — the only receivers this rule can prove are the same object across two statements without alias analysis. */
  public static targetOf(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }
    if (node.type === 'ThisExpression') {
      return 'this';
    }
    if (node.type === 'Identifier' && typeof node.name === 'string') {
      return node.name;
    }

    return undefined;
  }

  /** The static property-name key of a non-computed or literal-computed member access. */
  public static keyOfMember(member: unknown): string | undefined {
    if (!ObjectGuard.isObject(member)) {
      return undefined;
    }

    const result = PropertyKeyName.resolve(member.property, member.computed === true);

    return result;
  }

  /** The static string value of a `Literal` node — used for a `key` argument. */
  public static literalStringOf(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node) || node.type !== 'Literal' || typeof node.value !== 'string') {
      return undefined;
    }

    return node.value;
  }
}

class DescriptorClassification {
  /** True when a descriptor object literal declares `get` or `set` — the accessor form measured to diverge instance maps (see module comment). */
  public static isAccessorDescriptor(descriptorNode: unknown): boolean {
    if (!ObjectGuard.isObject(descriptorNode) || descriptorNode.type !== 'ObjectExpression') {
      return false;
    }

    const properties = descriptorNode.properties;

    if (!ObjectGuard.isArray(properties)) {
      return false;
    }

    const result = properties.some((prop) => {
      if (!ObjectGuard.isObject(prop) || prop.type !== 'Property') {
        return false;
      }

      const keyName = PropertyKeyName.resolve(prop.key, prop.computed === true);

      const isAccessorKey = keyName === 'get' || keyName === 'set';

      return isAccessorKey;
    });

    return result;
  }
}

class EnclosingFunction {
  /** Nearest enclosing function-like node, or `undefined` for module-top-level code. */
  public static find(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }
}

/** Tracks, per enclosing function, which `target::key` property identities have already been established (by a plain assignment or a prior `defineProperty`/`defineProperties` entry). */
class EstablishmentTracker {
  private readonly byScope = new Map<Rule.Node | undefined, Set<string>>();

  private scopeSetFor(scope: Rule.Node | undefined): Set<string> {
    const existing = this.byScope.get(scope);

    if (existing !== undefined) {
      return existing;
    }
    const created = new Set<string>();

    this.byScope.set(scope, created);

    return created;
  }

  public establish(node: Rule.Node, target: string, key: string): void {
    this.scopeSetFor(EnclosingFunction.find(node)).add(`${target}::${key}`);
  }

  public wasEstablished(node: Rule.Node, target: string, key: string): boolean {
    const isEstablished = this.byScope.get(EnclosingFunction.find(node))?.has(`${target}::${key}`) ?? false;

    return isEstablished;
  }
}

/** Evaluates one `(target, key, descriptor)` triple: records establishment and reports a redefinition or accessor hazard. Shared by the single-property `defineProperty` form and each entry of the multi-property `defineProperties` form. */
class HazardEvaluator {
  public static evaluateEntry(
    callNode: Rule.Node,
    targetArg: unknown,
    key: string,
    descriptorArg: unknown,
    tracker: EstablishmentTracker
  ): boolean {
    const target = PropertyIdentity.targetOf(targetArg);

    if (target === undefined) {
      return false;
    }

    const isAccessor = DescriptorClassification.isAccessorDescriptor(descriptorArg);
    const isRedefinition = tracker.wasEstablished(callNode, target, key);

    tracker.establish(callNode, target, key);

    const result = isAccessor || isRedefinition;

    return result;
  }
}

export const defineProperty: Rule.RuleModule = {
  'create': (context) => {
    const aliases = new AliasRegistry();
    const tracker = new EstablishmentTracker();

    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      if (node.operator !== '=' || node.left.type !== 'MemberExpression') {
        return;
      }

      const target = PropertyIdentity.targetOf(node.left.object);
      const key = PropertyIdentity.keyOfMember(node.left);

      if (target === undefined || key === undefined) {
        return;
      }

      tracker.establish(node, target, key);
    };

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      aliases.observeDeclarator(node);
    };

    // Evaluates the two-or-more-argument `defineProperty`/`Reflect.defineProperty` call
    // shape: `(target, key, descriptor)`. Reports only when `HazardEvaluator` proves a
    // redefinition or an accessor descriptor.
    const evaluateSingleForm = (node: Rule.Node & { readonly 'arguments': readonly unknown[] }): void => {
      const [
        targetArg,
        keyArg,
        descriptorArg
      ] = node.arguments;
      const key = PropertyIdentity.literalStringOf(keyArg);

      if (key === undefined) {
        return;
      }
      if (!HazardEvaluator.evaluateEntry(node, targetArg, key, descriptorArg, tracker)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    // Evaluates `Object.defineProperties(target, { key1: descriptor1, key2: descriptor2 })`.
    // Reports once for the whole call if ANY entry is a redefinition or an accessor.
    const evaluateMultiForm = (node: Rule.Node & { readonly 'arguments': readonly unknown[] }): void => {
      const [
        targetArg,
        descriptorsMapArg
      ] = node.arguments;

      if (!ObjectGuard.isObject(descriptorsMapArg) || descriptorsMapArg.type !== 'ObjectExpression') {
        return;
      }

      const properties = descriptorsMapArg.properties;

      if (!ObjectGuard.isArray(properties)) {
        return;
      }

      let anyHazard = false;
      const propertiesLength = properties.length;

      for (let index = 0; index < propertiesLength; index += 1) {
        const prop = properties.at(index);

        if (!ObjectGuard.isObject(prop) || prop.type !== 'Property') {
          continue;
        }
        const key = PropertyKeyName.resolve(prop.key, prop.computed === true);

        if (key === undefined) {
          continue;
        }

        if (HazardEvaluator.evaluateEntry(node, targetArg, key, prop.value, tracker)) {
          anyHazard = true;
        }
      }

      if (anyHazard) {
        context.report({
          'messageId': 'forbidden', 'node': node
        });
      }
    };

    const dispatch = (
      node: Rule.Node & { readonly 'arguments': readonly unknown[] },
      methodName: string
    ): void => {
      if (methodName === 'defineProperty') {
        evaluateSingleForm(node);

        return;
      }

      evaluateMultiForm(node);
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callee = node.callee as unknown;

      if (!ObjectGuard.isObject(callee)) {
        return;
      }

      if (callee.type === 'Identifier' && typeof callee.name === 'string') {
        // Destructured form: `const { defineProperty } = Object; defineProperty(...)`.
        const destructuredMethod = aliases.destructuredMethodNames.get(callee.name);

        if (destructuredMethod !== undefined) {
          dispatch(node, destructuredMethod);
        }

        return;
      }

      if (callee.type !== 'MemberExpression') {
        return;
      }

      const objectNode = callee.object;

      if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'Identifier' || typeof objectNode.name !== 'string') {
        return;
      }

      const methodName = PropertyKeyName.resolve(callee.property, callee.computed === true);

      if (methodName === undefined) {
        return;
      }

      if (objectNode.name === 'Reflect') {
        // Reflect only mirrors the singular form; there is no Reflect.defineProperties.
        if (methodName === 'defineProperty') {
          evaluateSingleForm(node);
        }

        return;
      }

      if (aliases.objectAliases.has(objectNode.name) && TARGET_METHOD_NAMES.has(methodName)) {
        dispatch(node, methodName);
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'CallExpression': onCallExpression,
      'VariableDeclarator': onVariableDeclarator
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
