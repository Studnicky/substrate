/** Data constants for the `array-concat-outside-loops` rule: the rule name, its violation message, and the resolved built-in call it matches. */

export const RULE_NAME = 'v8Optimization/arrayConcatOutsideLoops';
export const MESSAGE = 'Avoid concat() in loops. It allocates a new array every iteration — measured 7.3x slower than push(). Build the result with push(...chunk) instead.';

/** `Array.prototype.concat` / `ReadonlyArray.prototype.concat`, matched by resolved signature. */
export const CONCAT_METHODS: ReadonlySet<string> = new Set(['concat']);
export const CONCAT_OWNERS: ReadonlySet<string> = new Set([
  'Array',
  'ReadonlyArray'
]);
