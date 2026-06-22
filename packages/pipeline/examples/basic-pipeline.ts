/**
 * Basic pipeline example
 *
 * Demonstrates creating a Pipeline<T>, registering stages, running a context
 * through all stages, and using the removal function returned by add() to
 * unregister a stage at runtime.
 *
 * Run:
 *   npx tsx packages/pipeline/examples/basic-pipeline.ts
 */

import assert from 'node:assert/strict';

import { Pipeline } from '../src/index.js';

interface NumCtx {
  value: number;
}

const pipeline = new Pipeline<NumCtx>();

// Stage 0: multiply by 2
const removeDouble = pipeline.add((ctx) => ({ value: ctx.value * 2 }));

// Stage 1: add 10
pipeline.add((ctx) => ({ value: ctx.value + 10 }));

// Stage 2: multiply by 3
pipeline.add((ctx) => ({ value: ctx.value * 3 }));

console.log(`Stages registered: ${pipeline.stages.length}`);

// Run: (5 * 2 + 10) * 3 = 60
const result = await pipeline.run({ value: 5 });
console.log(`Result with 3 stages: ${result.value}`);
assert.equal(result.value, 60, `Expected 60, got ${result.value}`);

// Remove stage 0 (the doubling stage) using the unsubscribe function
removeDouble();
console.log(`Stages after removal: ${pipeline.stages.length}`);

// Re-run: (5 + 10) * 3 = 45
const resultWithout = await pipeline.run({ value: 5 });
console.log(`Result without double stage: ${resultWithout.value}`);
assert.equal(resultWithout.value, 45, `Expected 45, got ${resultWithout.value}`);

console.log('basic-pipeline: all assertions passed');
