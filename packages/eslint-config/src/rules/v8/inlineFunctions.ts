import type { Rule } from 'eslint';

import { FunctionScope } from './functionScope.js';

const EXEMPT_KEYS: ReadonlySet<string> = new Set(['transform', 'transformAsync']);

class AstHelpers {
  static isNonNullObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object';
  }
}

class PropertyKeyName {
  static get(property: unknown): string | undefined {
    if (!AstHelpers.isNonNullObject(property)) { return undefined; }
    const key: unknown = property.key;
    if (!AstHelpers.isNonNullObject(key) || key.type !== 'Identifier') { return undefined; }
    return typeof key.name === 'string' ? key.name : undefined;
  }
}

export const inlineFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onProperty: NonNullable<Rule.RuleListener['Property']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const value: unknown = rawNode.value;

      if (!AstHelpers.isNonNullObject(value) || value.type !== 'FunctionExpression') { return; }

      const parent = node.parent;
      if (parent.type !== 'ObjectExpression') { return; }

      const keyName = PropertyKeyName.get(node);
      if (keyName !== undefined && EXEMPT_KEYS.has(keyName)) { return; }

      // A map built once at module scope or a `static` class field never
      // re-allocates its function values — only a rebuilt-per-call map pays
      // repeated allocation cost.
      if (!FunctionScope.isRebuiltInFunctionScope(parent)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'Property': onProperty };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline function expressions in a dispatch map that is rebuilt on every call. Pre-built (module-scope or `static`) maps are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineFunctions: Inline function expression in a dispatch map rebuilt on every call. Extract to a named function, or hoist the map to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
