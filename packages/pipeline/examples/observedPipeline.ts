/** observedPipeline — trace every hook in a multi-stage pipeline. Run: npx tsx examples/observedPipeline.ts */

import assert from 'node:assert/strict';

// #region usage
import type { PipelineOptionsEntity } from '../src/entities/index.js';
import type { PipelineFunctionInterface } from '../src/interfaces/index.js';
import type { StepContextTypeEntity } from './entities/StepContextTypeEntity.js';

import { Pipeline, PipelineError } from '../src/index.js';

class TracingPipeline<T extends StepContextTypeEntity.Type> extends Pipeline<T> {
  public constructor(
    stages: readonly PipelineFunctionInterface<T>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ) {
    super(stages, options);
  }

  readonly stageStartEvents: { 'context': T; 'index': number }[] = [];
  readonly stageSuccessEvents: { 'context': T; 'index': number }[] = [];
  readonly stageErrorEvents: { 'error': unknown; 'index': number }[] = [];
  readonly runErrorEvents: { 'error': unknown }[] = [];

  protected override onRunStart(context: T): T {
    console.log('[pipeline] runStart');
    return context;
  }

  protected override beforeStage(context: T, index: number): T {
    console.log(`[pipeline] beforeStage index=${index}`);
    return context;
  }

  protected override onStageStart(index: number, context: T): void {
    console.log(`[pipeline] stageStart index=${index}`);
    this.stageStartEvents.push({ 'context': context, 'index': index });
  }

  protected override onStageSuccess(index: number, context: T): void {
    console.log(`[pipeline] stageSuccess index=${index}`);
    this.stageSuccessEvents.push({ 'context': context, 'index': index });
  }

  protected override afterStage(context: T, index: number): T {
    console.log(`[pipeline] afterStage index=${index}`);
    return context;
  }

  protected override onStageError(index: number, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[pipeline] stageError index=${index} error=${message}`);
    this.stageErrorEvents.push({ 'error': error, 'index': index });
  }

  protected override onRunError(error: unknown): void {
    const message = error instanceof PipelineError ? `PipelineError: ${error.message}` : String(error);
    console.log(`[pipeline] runError error=${message}`);
    this.runErrorEvents.push({ 'error': error });
  }

  protected override onRunComplete(context: T): T {
    console.log('[pipeline] runComplete');
    return context;
  }
}

// ── Happy-path run: 3 stages that mutate step/value ───────────────────────────

const successPipeline = new TracingPipeline<StepContextTypeEntity.Type>([
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->alpha` }; },
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->beta` }; },
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->gamma` }; }
]);

console.log('\n--- happy path ---');
const successResult = await successPipeline.run({ 'step': 0, 'value': 'start' });
console.log(`result: step=${successResult.step} value=${successResult.value}`);

// ── Failing run: 2 stages where the second throws ────────────────────────────

const failPipeline = new TracingPipeline<StepContextTypeEntity.Type>([
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->alpha` }; },
  (_context) => { throw new Error('stage 1 fails'); }
]);

console.log('\n--- failing path ---');
try {
  await failPipeline.run({ 'step': 0, 'value': 'start' });
} catch (error: unknown) {
  const message = error instanceof PipelineError ? `PipelineError: ${error.message}` : String(error);
  console.log(`caught: ${message}`);
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

assert.strictEqual(successPipeline.stageSuccessEvents[0]?.context.value, 'start->alpha');
assert.strictEqual(successPipeline.stageSuccessEvents[1]?.context.value, 'start->alpha->beta');
assert.strictEqual(successPipeline.stageSuccessEvents[2]?.context.value, 'start->alpha->beta->gamma');

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
