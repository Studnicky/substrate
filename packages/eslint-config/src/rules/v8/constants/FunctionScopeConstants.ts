import type { Rule } from 'eslint';

/** Data constants for `FunctionScope`: the AST node-type sets used to detect function-scope and loop boundaries, and the memoization cache for the rebuilt-in-function-scope walk. */

export const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression'
]);

export const LOOP_TYPES: ReadonlySet<string> = new Set([
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement'
]);

// Ancestor-chain walks are pure functions of their starting node: for a given
// dispatch-map object literal, every function-valued property in it passes
// the SAME ObjectExpression node as the starting point (see inlineFunctions.ts
// and inlineArrowFunctions.ts). Memoizing on that node avoids re-walking the
// identical ancestor chain once per property. Keyed by object reference, so
// entries are garbage-collected once a file's AST is no longer referenced —
// this cannot leak across files.
export const REBUILT_IN_FUNCTION_SCOPE_CACHE: WeakMap<Rule.Node, boolean> = new WeakMap();
