/** Data constants for the `memoize-array-length` rule: the rule name, its message, and the AST node-type/operator sets used to detect the reassignment-defeats-memoization anti-pattern. */

export const RULE_NAME = 'memoizeArrayLength';
export const MESSAGE = 'Loop bound variable is reassigned to array.length inside the loop body, defeating the memoization — .length is re-read every iteration exactly as if it were never memoized, but the code now also carries the extra variable\'s complexity for zero benefit.';

export const LOOP_TYPES: ReadonlySet<string> = new Set([
  'ForStatement',
  'WhileStatement'
]);
export const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression'
]);
export const COMPARISON_OPERATORS: ReadonlySet<string> = new Set([
  '<',
  '<=',
  '>',
  '>='
]);
