/** Data constants for `LoopContext`: the AST node types that form syntactic loops and function-scope boundaries, and the built-in iteration methods whose callbacks run once per element. */

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

/**
 * Standard-library interfaces that declare per-element iteration methods. Typed
 * arrays each declare their own `forEach`/`map`/… rather than inheriting from
 * `Array`, so every one must be listed or their callbacks escape loop detection.
 */
export const ITERATION_OWNERS: ReadonlySet<string> = new Set([
  'Array',
  'BigInt64Array',
  'BigUint64Array',
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Map',
  'ReadonlyArray',
  'ReadonlyMap',
  'ReadonlySet',
  'Set',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array'
]);

/** Methods whose function argument is invoked once per element. */
export const ITERATION_METHODS: ReadonlySet<string> = new Set([
  'every',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'reduceRight',
  'some',
  'sort'
]);
