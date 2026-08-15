/** Data constants for the `memoize-array-length` rule: the rule name, its messages, and the AST node-type/operator sets used to detect the unmemoized-length anti-pattern. */

export const RULE_NAME = 'v8Optimization/memoizeArrayLength';
export const MESSAGE = 'Re-reading array.length on every loop iteration prevents V8 optimization. Memoize the length into a variable before the loop, and do not reassign that variable back to `.length` inside the loop body.';

export const LOOP_TYPES: ReadonlySet<string> = new Set(['ForStatement', 'WhileStatement']);
export const FUNCTION_TYPES: ReadonlySet<string> = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);
export const COMPARISON_OPERATORS: ReadonlySet<string> = new Set(['<', '<=', '>', '>=']);
