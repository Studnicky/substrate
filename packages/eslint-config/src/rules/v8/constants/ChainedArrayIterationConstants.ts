/** Data constants for the `chained-array-iteration` rule: rule identity, its violation message, and the resolved built-in calls it matches. */

export const RULE_NAME = 'v8Optimization/chainedArrayIteration';
export const MESSAGE = 'Chaining map()/filter()/forEach()/reduce()/flatMap()/some()/every()/find() allocates an intermediate array and iterates twice. Measured 2.02x slower (102% more time) than a single reduce() at 5,000,000 elements — see the rule source for the reproducing benchmark. Use a single reduce() to do both passes in one.';

/** `Array.prototype`/`ReadonlyArray.prototype` iteration methods, matched by resolved signature. Typed arrays are excluded: `flatMap` has no `TypedArray.prototype` form. */
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
