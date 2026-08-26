/** Data constants for the `regexp-in-loops` rule: rule identity, its violation message, and the AST node-type sets used to locate the nearest per-iteration boundary for the pattern-invariance check. */

export const RULE_NAME = 'v8Optimization/regexpInLoops';
export const MESSAGE = 'RegExp construction inside a loop causes per-iteration allocation. Hoist the RegExp to the outer scope.';

/**
 * Mirrors `shared/constants/LoopContextConstants.ts`'s node-type sets. Duplicated
 * locally (the established convention in this file set — see `FunctionScopeConstants.ts`
 * and `ArrayScanOutsideLoopsConstants.ts`) because this rule needs the actual boundary
 * NODE for the pattern-invariance range check below, not `LoopContext`'s boolean.
 */
export const LOOP_TYPES: ReadonlySet<string> = new Set([
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement'
]);
export const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression'
]);
