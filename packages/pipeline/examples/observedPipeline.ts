/** observedPipeline — trace every hook in a multi-stage pipeline. Run: npx tsx examples/observedPipeline.ts */

import assert from 'node:assert/strict';

// #region usage
import type { StepCtxTypeEntity } from './entities/StepCtxTypeEntity.js';

import { Pipeline, PipelineError } from '../src/index.js';

class TracingPipeline<T extends StepCtxTypeEntity.Type> extends Pipeline<T> {
  readonly stageStartEvents: { 'ctx': T; 'index': number }[] = [];
  readonly stageSuccessEvents: { 'ctx': T; 'index': number }[] = [];
  readonly stageErrorEvents: { 'error': unknown; 'index': number }[] = [];
  readonly runErrorEvents: { 'error': unknown }[] = [];

  protected override onRunStart(ctx: T): T {
    console.log('[pipeline] runStart');
    return ctx;
  }

  protected override beforeStage(ctx: T, index: number): T {
    console.log(`[pipeline] beforeStage index=${index}`);
    return ctx;
  }

  protected override onStageStart(index: number, ctx: T): void {
    console.log(`[pipeline] stageStart index=${index}`);
    this.stageStartEvents.push({ 'ctx': ctx, 'index': index });
  }

  protected override onStageSuccess(index: number, ctx: T): void {
    console.log(`[pipeline] stageSuccess index=${index}`);
    this.stageSuccessEvents.push({ 'ctx': ctx, 'index': index });
  }

  protected override afterStage(ctx: T, index: number): T {
    console.log(`[pipeline] afterStage index=${index}`);
    return ctx;
  }

  protected override onStageError(index: number, error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[pipeline] stageError index=${index} error=${msg}`);
    this.stageErrorEvents.push({ 'error': error, 'index': index });
  }

  protected override onRunError(error: unknown): void {
    const msg = error instanceof PipelineError ? `PipelineError: ${error.message}` : String(error);
    console.log(`[pipeline] runError error=${msg}`);
    this.runErrorEvents.push({ 'error': error });
  }

  protected override onRunComplete(ctx: T): T {
    console.log('[pipeline] runComplete');
    return ctx;
  }
}

// ── Happy-path run: 3 stages that mutate step/value ───────────────────────────

const successPipeline = TracingPipeline.create<StepCtxTypeEntity.Type>([
  (ctx) => { return { 'step': ctx.step + 1, 'value': `${ctx.value}->alpha` }; },
  (ctx) => { return { 'step': ctx.step + 1, 'value': `${ctx.value}->beta` }; },
  (ctx) => { return { 'step': ctx.step + 1, 'value': `${ctx.value}->gamma` }; }
]);

console.log('\n--- happy path ---');
const successResult = await successPipeline.run({ 'step': 0, 'value': 'start' });
console.log(`result: step=${successResult.step} value=${successResult.value}`);

// ── Failing run: 2 stages where the second throws ────────────────────────────

const failPipeline = TracingPipeline.create<StepCtxTypeEntity.Type>([
  (ctx) => { return { 'step': ctx.step + 1, 'value': `${ctx.value}->alpha` }; },
  (_ctx) => { throw new Error('stage 1 fails'); }
]);

console.log('\n--- failing path ---');
try {
  await failPipeline.run({ 'step': 0, 'value': 'start' });
} catch (err: unknown) {
  const msg = err instanceof PipelineError ? `PipelineError: ${err.message}` : String(err);
  console.log(`caught: ${msg}`);
}
// #endregion usage

// ── Assertions ────────────────────────────────────────────────────────────────

// Success pipeline: 3 stages all started and succeeded
assert.strictEqual(successPipeline.stageStartEvents.length, 3);
assert.strictEqual(successPipeline.stageSuccessEvents.length, 3);
assert.strictEqual(successPipeline.stageErrorEvents.length, 0);
assert.strictEqual(successPipeline.runErrorEvents.length, 0);

assert.strictEqual(successPipeline.stageStartEvents[0]?.index, 0);
assert.strictEqual(successPipeline.stageStartEvents[1]?.index, 1);
assert.strictEqual(successPipeline.stageStartEvents[2]?.index, 2);

assert.strictEqual(successPipeline.stageSuccessEvents[0]?.ctx.value, 'start->alpha');
assert.strictEqual(successPipeline.stageSuccessEvents[1]?.ctx.value, 'start->alpha->beta');
assert.strictEqual(successPipeline.stageSuccessEvents[2]?.ctx.value, 'start->alpha->beta->gamma');

// Fail pipeline: stage 0 succeeded, stage 1 errored, run errored
assert.strictEqual(failPipeline.stageStartEvents.length, 2);
assert.strictEqual(failPipeline.stageSuccessEvents.length, 1);
assert.strictEqual(failPipeline.stageSuccessEvents[0]?.index, 0);
assert.strictEqual(failPipeline.stageErrorEvents.length, 1);
assert.strictEqual(failPipeline.stageErrorEvents[0]?.index, 1);
assert.ok(failPipeline.stageErrorEvents[0]?.error instanceof Error);
assert.strictEqual(failPipeline.runErrorEvents.length, 1);
assert.ok(failPipeline.runErrorEvents[0]?.error instanceof PipelineError);

console.log('observedPipeline: all assertions passed');
