/** Data constants for the `array-from-iterators` rule: rule identity, its violation message, and the resolved built-in call it matches. */

export const RULE_NAME = 'v8Optimization/arrayFromIterators';
export const MESSAGE = 'Avoid manually draining an iterable into an array with a for...of + push() loop. `Array.from(iterable)` and `[...iterable]` are both measurably faster (7.53x at 5,000,000 elements — see the rule source for the reproducing benchmark) and equally fast as each other — use one of those instead.';

/** `Array.prototype.push`, matched by resolved signature — see `shared/CallIdentity.ts`. */
export const PUSH_METHODS: ReadonlySet<string> = new Set(['push']);
export const PUSH_OWNERS: ReadonlySet<string> = new Set(['Array']);
