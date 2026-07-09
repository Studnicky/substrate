import type { Rule } from 'eslint';

import { isRebuiltInFunctionScope } from './isRebuiltInFunctionScope.js';

const EXEMPT_KEYS: ReadonlySet<string> = new Set([
  'callback', 'execute', 'handler', 'process', 'transform', 'transformAsync', 'validate'
]);

const isNonNullObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object';};

class PropertyKeyName {
  static get(property: unknown): string | undefined {
    if (!isNonNullObject(property)) { return undefined; }
    const key: unknown = property.key;
    if (!isNonNullObject(key) || key.type !== 'Identifier') { return undefined; }
    return typeof key.name === 'string' ? key.name : undefined;
  }
}

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const body: unknown = rawNode.body;

      if (!isNonNullObject(body) || body.type !== 'BlockStatement') { return; }

      const parent = node.parent;
      if (parent.type !== 'Property') { return; }

      const grandparent = parent.parent;
      if (grandparent.type !== 'ObjectExpression') { return; }

      const keyName = PropertyKeyName.get(parent);
      if (keyName !== undefined && EXEMPT_KEYS.has(keyName)) { return; }

      // A map built once at module scope or a `static` class field never
      // re-allocates its arrow-function values — only a rebuilt-per-call map
      // pays repeated closure-allocation cost.
      if (!isRebuiltInFunctionScope(grandparent)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'ArrowFunctionExpression': onArrowFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline multi-statement arrow functions in a dispatch map that is rebuilt on every call. Pre-built (module-scope or `static`) maps are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineArrowFunctions: Inline multi-statement arrow function in a dispatch map rebuilt on every call. Extract to a named function, or hoist the map to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
