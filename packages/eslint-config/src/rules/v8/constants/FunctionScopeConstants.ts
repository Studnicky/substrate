import type { Rule } from 'eslint';

/** Data constants for `FunctionScope`: the AST node-type sets for detecting function-scope and loop boundaries, and the memoization cache for the rebuilt-in-function-scope walk. */

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

// Memoizes the ancestor-chain walk per starting ObjectExpression (shared across its properties
// in inlineFunctions.ts/inlineArrowFunctions.ts). WeakMap-keyed, so entries cannot leak across files.
export const REBUILT_IN_FUNCTION_SCOPE_CACHE: WeakMap<Rule.Node, boolean> = new WeakMap();
