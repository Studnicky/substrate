/** Data constants for the `chained-array-iteration` rule: rule identity, its violation message, and the resolved built-in calls it matches. */

export const RULE_NAME = 'v8Optimization/chainedArrayIteration';
export const MESSAGE = 'Chaining map()/filter()/forEach()/reduce()/flatMap()/some()/every()/find() allocates an intermediate array and iterates twice. Measured 2.02x slower (102% more time) than a single reduce() at 5,000,000 elements — see the rule source for the reproducing benchmark. Use a single reduce() to do both passes in one.';

/**
 * `Array.prototype`/`ReadonlyArray.prototype` iteration methods, matched by resolved
 * signature — see `shared/CallIdentity.ts`. Typed arrays are deliberately excluded:
 * `flatMap` does not exist on `TypedArray.prototype`, so including the typed-array
 * owners here would need a per-method owner set rather than one shared set, which is
 * not worth the complexity for a chain-shape rule where the receiver is overwhelmingly
 * a plain `Array` in practice.
 */
export const ITERATION_METHOD_NAMES: ReadonlySet<string> = new Set([
  'every',
  'filter',
  'find',
  'flatMap',
  'forEach',
  'map',
  'reduce',
  'some'
]);
export const ITERATION_OWNERS: ReadonlySet<string> = new Set([
  'Array',
  'ReadonlyArray'
]);
