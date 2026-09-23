import { SelectorRule } from './SelectorRule.js';

// Measured replacement costs and message-design rationale: docs/eslint/rules/v8/for-in-loops.md
export const forInLoops = SelectorRule.create(
  'v8Optimization/forInLoops',
  'ForInStatement',
  'for...in loops are forbidden. Use Object.values(obj) or Object.keys(obj), computed ONCE outside any loop that repeats over the same object, then iterate the resulting array — measured 0.023x-0.262x of for-in\'s cost at 5,000,000 property visits when hoisted this way. Do NOT call Object.entries(obj)/Object.keys(obj) fresh inside the replacement loop: Object.entries recomputed per-iteration measured 3.8x SLOWER than for-in, because it allocates a [key, value] pair per property every time.'
);
