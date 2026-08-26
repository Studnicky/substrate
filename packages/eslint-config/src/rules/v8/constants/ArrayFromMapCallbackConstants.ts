/** Data constants for the `array-from-map-callback` rule: rule identity, its violation message, and the resolved built-in call it matches. */

export const RULE_NAME = 'v8Optimization/arrayFromMapCallback';
export const MESSAGE = 'Array.from(iterable, mapFn) pays iterator-protocol overhead plus a per-element mapper call. Measured 12.65x slower than `new Array(n)` + an index-assignment loop at 5,000,000 elements (see the rule source for the reproducing benchmark). Prefer the manual index-fill loop, or drop the map argument and map separately only when the source is already an array.';

/** `ArrayConstructor.from`, matched by resolved signature — see `shared/CallIdentity.ts`. */
export const FROM_METHODS: ReadonlySet<string> = new Set(['from']);
export const FROM_OWNERS: ReadonlySet<string> = new Set(['ArrayConstructor']);
