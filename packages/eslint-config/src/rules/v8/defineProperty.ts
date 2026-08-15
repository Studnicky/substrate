import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';

const TARGET_METHOD_NAMES: ReadonlySet<string> = new Set(['defineProperties', 'defineProperty']);

class PropertyKeyName {
  // Resolves a (possibly computed, bracket-notation) member property to its
  // static string name. Handles `Object.defineProperty` (non-computed
  // Identifier) and `Object['defineProperty']` (computed string Literal)
  // alike; returns undefined for anything else (e.g. a truly dynamic key),
  // which correctly falls through to "not matched".
  public static resolve(propertyNode: unknown, computed: boolean): string | undefined {
    if (!ObjectGuard.isObject(propertyNode)) { return undefined; }

    if (!computed && propertyNode.type === 'Identifier' && typeof propertyNode.name === 'string') {
      return propertyNode.name;
    }

    if (computed && propertyNode.type === 'Literal' && typeof propertyNode.value === 'string') {
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
  public readonly destructuredMethodNames = new Set<string>();

  public observeDeclarator(node: unknown): void {
    if (!ObjectGuard.isObject(node)) { return; }
    const id = node.id;
    const init = node.init;
    if (!ObjectGuard.isObject(id) || !ObjectGuard.isObject(init)) { return; }
    if (init.type !== 'Identifier' || typeof init.name !== 'string') { return; }
    if (!this.objectAliases.has(init.name)) { return; }

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
        if (!ObjectGuard.isObject(property) || property.type !== 'Property') { continue; }
        const keyName = PropertyKeyName.resolve(property.key, property.computed === true);
        if (keyName === undefined || !TARGET_METHOD_NAMES.has(keyName)) { continue; }

        const valueNode = property.value;
        if (ObjectGuard.isObject(valueNode) && valueNode.type === 'Identifier' && typeof valueNode.name === 'string') {
          this.destructuredMethodNames.add(valueNode.name);
        }
      }
    }
  }
}

export const defineProperty: Rule.RuleModule = {
  'create': (context) => {
    const aliases = new AliasRegistry();

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      aliases.observeDeclarator(node);
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callee = node.callee as unknown;
      if (!ObjectGuard.isObject(callee)) { return; }

      if (callee.type === 'Identifier' && typeof callee.name === 'string') {
        // Destructured form: `const { defineProperty } = Object; defineProperty(...)`.
        if (aliases.destructuredMethodNames.has(callee.name)) {
          context.report({ 'messageId': 'forbidden', 'node': node });
        }
        return;
      }

      if (callee.type !== 'MemberExpression') { return; }

      const objectNode = callee.object;
      if (!ObjectGuard.isObject(objectNode) || objectNode.type !== 'Identifier' || typeof objectNode.name !== 'string') { return; }

      const methodName = PropertyKeyName.resolve(callee.property, callee.computed === true);
      if (methodName === undefined) { return; }

      if (objectNode.name === 'Reflect') {
        // Reflect only mirrors the singular form; there is no Reflect.defineProperties.
        if (methodName === 'defineProperty') {
          context.report({ 'messageId': 'forbidden', 'node': node });
        }
        return;
      }

      if (aliases.objectAliases.has(objectNode.name) && TARGET_METHOD_NAMES.has(methodName)) {
        context.report({ 'messageId': 'forbidden', 'node': node });
      }
    };

    return {
      'CallExpression': onCallExpression,
      'VariableDeclarator': onVariableDeclarator
    };
  },
  'meta': {
    'docs': {
      'description': 'Object.defineProperty/defineProperties (and Reflect.defineProperty, and their aliased/destructured/bracket-notation forms) break hidden classes.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/defineProperty: Object.defineProperty breaks hidden classes.' },
    'schema': [],
    'type': 'problem'
  }
};
