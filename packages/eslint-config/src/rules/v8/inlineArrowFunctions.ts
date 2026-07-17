import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { PropertyKeyName } from '../shared/propertyKeyName.js';
import { FunctionScope } from './functionScope.js';

const EXEMPT_KEYS: ReadonlySet<string> = new Set([
  'callback', 'execute', 'handler', 'message', 'process', 'transform', 'transformAsync', 'validate'
]);

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const body: unknown = rawNode.body;

      if (!ObjectGuard.isObject(body) || body.type !== 'BlockStatement') { return; }

      const parent = node.parent;
      if (parent.type !== 'Property') { return; }

      const grandparent = parent.parent;
      if (grandparent.type !== 'ObjectExpression') { return; }

      const keyName = PropertyKeyName.get(parent);
      if (keyName !== undefined && EXEMPT_KEYS.has(keyName)) { return; }

      // A map built once at module scope or a `static` class field never
      // re-allocates its arrow-function values — only a rebuilt-per-call map
      // pays repeated closure-allocation cost.
      if (!FunctionScope.isRebuiltInFunctionScope(grandparent)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'ArrowFunctionExpression': onArrowFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline multi-statement arrow functions in a dispatch map that is rebuilt on every call. Pre-built (module-scope or `static`) maps are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineArrowFunctions: Inline multi-statement arrow function in a dispatch map rebuilt on every call. Extract to a static class method, or hoist the map to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
