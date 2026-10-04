/** Data constants for the `regexp-in-loops` rule: rule identity, its violation message, and the AST node-type sets for locating the nearest per-iteration boundary for the pattern-invariance check. */

export const RULE_NAME = 'v8Optimization/regexpInLoops';
export const MESSAGE = 'RegExp construction inside a loop causes per-iteration allocation. Hoist the RegExp to the outer scope.';

/** Duplicated from `shared/constants/LoopContextConstants.ts`: this rule needs the boundary node itself, not `LoopContext`'s boolean. */
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
