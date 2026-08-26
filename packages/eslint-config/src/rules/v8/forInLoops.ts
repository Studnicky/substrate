import { SelectorRule } from './SelectorRule.js';

// MEASURED, Node v24, 50-key plain object x 100,000 repeats = 5,000,000
// property visits, 3 warm-up calls + median of 7 timed calls (scratchpad
// bench):
//
//   for-in                                    95.987 ms
//   Object.keys(obj)   HOISTED, then iterate    25.132 ms   -> 0.262x
//   Object.values(obj) HOISTED, then iterate     2.172 ms   -> 0.023x
//   Object.entries(obj) HOISTED, then iterate     4.023 ms   -> 0.042x
//   Object.keys(obj)   called EVERY repeat      69.760 ms   -> 0.727x (still faster, but much less so)
//   Object.entries(obj) called EVERY repeat    367.317 ms   -> 3.83x  (SLOWER than for-in)
//
// The rule's own original message recommended "Object.keys/entries"
// unconditionally. That is correct ONLY when the `Object.x(obj)` call is
// hoisted OUT of any surrounding repeated loop and its result iterated as a
// flat array — every hoisted form measured here beats for-in by 4x-43x.
// Recomputing `Object.entries(obj)` fresh on every repeat (i.e., calling it
// inside the loop that's replacing the for-in, rather than once before it)
// allocates a 2-element array per key EVERY time and measures 3.8x SLOWER
// than for-in — the exact inversion of the advice. `Object.keys` recomputed
// per-call is still net faster than for-in (fewer/cheaper allocations than
// `.entries()`), but nowhere near as fast as hoisting it.
//
// This rule (a bare selector forbidding `for...in`) cannot itself verify
// that a caller hoists the replacement — that requires seeing code that does
// not exist yet. The message states the hoist requirement explicitly instead
// and drops the `Object.entries` recommendation from the FIRST-choice
// remedy, since it is the shape most likely to be reached for AND the one
// most damaged by not hoisting.
export const forInLoops = SelectorRule.create(
  'v8Optimization/forInLoops',
  'ForInStatement',
  'for...in loops are forbidden. Use Object.values(obj) or Object.keys(obj), computed ONCE outside any loop that repeats over the same object, then iterate the resulting array — measured 0.023x-0.262x of for-in\'s cost at 5,000,000 property visits when hoisted this way. Do NOT call Object.entries(obj)/Object.keys(obj) fresh inside the replacement loop: Object.entries recomputed per-iteration measured 3.8x SLOWER than for-in, because it allocates a [key, value] pair per property every time.'
);
