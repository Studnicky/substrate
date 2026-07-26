/** Data constants for the `array-scan-outside-loops` rule: the array-scan method names it targets, and the AST node-type sets used to detect loop and function-scope boundaries. */

export const SCAN_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'includes', 'indexOf', 'some']);
export const LOOP_TYPES: ReadonlySet<string> = new Set(['DoWhileStatement', 'ForInStatement', 'ForOfStatement', 'ForStatement', 'WhileStatement']);
export const FUNCTION_TYPES: ReadonlySet<string> = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);
