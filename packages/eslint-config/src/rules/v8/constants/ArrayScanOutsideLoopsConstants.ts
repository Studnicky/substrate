/** Data constants for the `array-scan-outside-loops` rule: rule identity, its violation message, the resolved built-in calls it matches, and the AST node-type sets used for the loop-local receiver exemption. */

export const RULE_NAME = 'v8Optimization/arrayScanOutsideLoops';
export const MESSAGE = 'These methods scan linearly. Called every loop iteration, this becomes O(n^2) — hoist the collection into a Map/Set outside the loop, or compute the result once and reuse it.';

/** `Array.prototype`/`ReadonlyArray.prototype`/typed-array linear-scan methods, matched by resolved signature — see `shared/CallIdentity.ts`. */
export const SCAN_METHODS: ReadonlySet<string> = new Set([
  'every',
  'filter',
  'find',
  'includes',
  'indexOf',
  'some'
]);

/** Every standard-library owner that declares these scan methods. Typed arrays each declare their own copy rather than inheriting from `Array`, so every one must be listed or its calls escape detection. */
export const SCAN_OWNERS: ReadonlySet<string> = new Set([
  'Array',
  'BigInt64Array',
  'BigUint64Array',
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'ReadonlyArray',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array'
]);

/** Used only by the loop-local receiver walk below (a distinct concern from `LoopContext`'s per-iteration boundary — this one needs the actual loop NODE for a range comparison, not a boolean). */
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
