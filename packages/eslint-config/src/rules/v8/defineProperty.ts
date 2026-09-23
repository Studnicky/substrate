import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import {
  MESSAGE, RULE_NAME
} from './constants/DefinePropertyConstants.js';

// See docs/eslint/rules/v8/define-property.md for the measured rationale. Establishment is
// tracked per enclosing function only; cross-function flow analysis is out of scope.

const TARGET_METHOD_NAMES: ReadonlySet<string> = new Set([
  'defineProperties',
  'defineProperty'
]);

class PropertyKeyName {
  // Resolves a static key from an Identifier OR a quoted Literal: the repo's `quote-props:
  // always` convention makes every object-literal key a `Literal` even when non-computed.
  public static resolve(propertyNode: unknown, computed: boolean): string | undefined {
    if (!Predicates.isRecord(propertyNode)) {
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
    if (!Predicates.isRecord(node)) {
      return;
    }
    const id = node.id;
    const init = node.init;

    if (!Predicates.isRecord(id) || !Predicates.isRecord(init)) {
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

        if (!Predicates.isRecord(property) || property.type !== 'Property') {
          continue;
        }
        const keyName = PropertyKeyName.resolve(property.key, property.computed === true);

        if (keyName === undefined || !TARGET_METHOD_NAMES.has(keyName)) {
          continue;
        }

        const valueNode = property.value;

        if (Predicates.isRecord(valueNode) && valueNode.type === 'Identifier' && typeof valueNode.name === 'string') {
          this.destructuredMethodNames.set(valueNode.name, keyName);
        }
      }
    }
  }
}

class PropertyIdentity {
  /** `this` or a simple identifier's name — the only receivers this rule can prove are the same object across two statements without alias analysis. */
  public static targetOf(node: unknown): string | undefined {
    if (!Predicates.isRecord(node)) {
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
    if (!Predicates.isRecord(member)) {
      return undefined;
    }

    const result = PropertyKeyName.resolve(member.property, member.computed === true);

    return result;
  }

  /** The static string value of a `Literal` node — used for a `key` argument. */
  public static literalStringOf(node: unknown): string | undefined {
    if (!Predicates.isRecord(node) || node.type !== 'Literal' || typeof node.value !== 'string') {
      return undefined;
    }

    return node.value;
  }
}

class DescriptorClassification {
  /** True when a descriptor object literal declares `get` or `set` — the accessor form measured to diverge instance maps (see module comment). */
  public static isAccessorDescriptor(descriptorNode: unknown): boolean {
    if (!Predicates.isRecord(descriptorNode) || descriptorNode.type !== 'ObjectExpression') {
      return false;
    }

    const properties = descriptorNode.properties;

    if (!Predicates.isArray(properties)) {
      return false;
    }

    const result = properties.some((prop) => {
      if (!Predicates.isRecord(prop) || prop.type !== 'Property') {
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

    // The `(target, key, descriptor)` call shape.
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

      if (!Predicates.isRecord(descriptorsMapArg) || descriptorsMapArg.type !== 'ObjectExpression') {
        return;
      }

      const properties = descriptorsMapArg.properties;

      if (!Predicates.isArray(properties)) {
        return;
      }

      let anyHazard = false;
      const propertiesLength = properties.length;

      for (let index = 0; index < propertiesLength; index += 1) {
        const prop = properties.at(index);

        if (!Predicates.isRecord(prop) || prop.type !== 'Property') {
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

      if (!Predicates.isRecord(callee)) {
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

      if (!Predicates.isRecord(objectNode) || objectNode.type !== 'Identifier' || typeof objectNode.name !== 'string') {
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
