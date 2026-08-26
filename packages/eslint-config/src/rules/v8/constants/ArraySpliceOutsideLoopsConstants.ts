/** Data constants for the `array-splice-outside-loops` rule: rule identity, its violation message, and the resolved built-in call it matches. */

export const RULE_NAME = 'v8Optimization/arraySpliceOutsideLoops';
export const MESSAGE = 'Avoid splice() in loops. Each call is O(n) (it shifts every element after the cut point) — repeated per-iteration calls make the loop O(n^2).';

/** `Array.prototype.splice`, matched by resolved signature — see `shared/CallIdentity.ts`. Not `ReadonlyArray`: `splice` is a mutating method and does not exist on the readonly interface. */
export const SPLICE_METHODS: ReadonlySet<string> = new Set(['splice']);
export const SPLICE_OWNERS: ReadonlySet<string> = new Set(['Array']);
