/**
 * basic-pipeline — construct a Pipeline<T> with a fixed stage array and run
 * a context through all stages. A different stage array constructs a
 * different fixed composition.
 *
 * Run: npx tsx packages/pipeline/examples/basic-pipeline.ts
 */

import assert from 'node:assert/strict';

// #region usage
import type { NumCtxTypeEntity } from './entities/NumCtxTypeEntity.js';

import { Pipeline } from '../src/index.js';

class NumStages {
  static double(ctx: NumCtxTypeEntity.Type): NumCtxTypeEntity.Type { return { 'value': ctx.value * 2 }; }
  static addTen(ctx: NumCtxTypeEntity.Type): NumCtxTypeEntity.Type { return { 'value': ctx.value + 10 }; }
  static timesThree(ctx: NumCtxTypeEntity.Type): NumCtxTypeEntity.Type { return { 'value': ctx.value * 3 }; }
}

// Three-stage pipeline: double, then add ten, then multiply by three
const threeStagePipeline = Pipeline.create<NumCtxTypeEntity.Type>([
  NumStages.double, NumStages.addTen, NumStages.timesThree
]);

// Two-stage pipeline: add ten, then multiply by three — a different fixed
// composition constructed from a different stage array
const twoStagePipeline = Pipeline.create<NumCtxTypeEntity.Type>([NumStages.addTen, NumStages.timesThree]);

console.log(`Three-stage pipeline stages: ${threeStagePipeline.stages.length}`);
console.log(`Two-stage pipeline stages: ${twoStagePipeline.stages.length}`);

class PipelineRunDemo {
  // Runs both fixed pipelines against the same input, returning both
  // results so the caller ends up with a single top-level binding.
  static async run(): Promise<{ 'withDouble': number; 'withoutDouble': number }> {
    // (5 * 2 + 10) * 3 = 60
    const result = await threeStagePipeline.run({ 'value': 5 });
    console.log(`Result with 3 stages: ${result.value}`);

    // (5 + 10) * 3 = 45
    const resultWithout = await twoStagePipeline.run({ 'value': 5 });
    console.log(`Result without double stage: ${resultWithout.value}`);

    return { 'withDouble': result.value, 'withoutDouble': resultWithout.value };
  }
}

const results = await PipelineRunDemo.run();
// #endregion usage

assert.equal(results.withDouble, 60, `Expected 60, got ${results.withDouble}`);
assert.equal(results.withoutDouble, 45, `Expected 45, got ${results.withoutDouble}`);

console.log('basic-pipeline: all assertions passed');
