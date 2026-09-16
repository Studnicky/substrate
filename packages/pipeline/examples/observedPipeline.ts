import { RuntimeError } from '@studnicky/errors/node';
/** observedPipeline — trace every hook in a multi-stage pipeline. Run: npx tsx examples/observedPipeline.ts */
import assert from 'node:assert/strict';

// #region usage
import type { PipelineFunctionInterface } from '../src/interfaces/index.js';

import { Pipeline } from '../src/index.js';
import { StepContextTypeEntity } from './entities/StepContextTypeEntity.js';

class TracingPipeline<T extends StepContextTypeEntity.Type> extends Pipeline<T> {
  public constructor(
    stages: readonly PipelineFunctionInterface<T>[]
  ) {
    super(stages);
  }

  readonly stageStartEvents: { 'context': Readonly<T>; 'index': number }[] = [];
  readonly stageSuccessEvents: { 'context': Readonly<T>; 'index': number }[] = [];
  readonly stageErrorIndexes: number[] = [];
  runErrorCount = 0;

  protected override onRunStart(_context: Readonly<T>): void {
    console.log('[pipeline] runStart');
  }

  protected override beforeStage(context: T, index: number): T {
    console.log(`[pipeline] beforeStage index=${index}`);
    return context;
  }

  protected override onStageStart(index: number, context: Readonly<T>): void {
    console.log(`[pipeline] stageStart index=${index}`);
    this.stageStartEvents.push({ 'context': context, 'index': index });
  }

  protected override onStageSuccess(index: number, context: Readonly<T>): void {
    console.log(`[pipeline] stageSuccess index=${index}`);
    this.stageSuccessEvents.push({ 'context': context, 'index': index });
  }

  protected override afterStage(context: T, index: number): T {
    console.log(`[pipeline] afterStage index=${index}`);
    return context;
  }

  protected override onStageError(index: number): void {
    console.log(`[pipeline] stageError index=${index}`);
    this.stageErrorIndexes.push(index);
  }

  protected override onRunError(): void {
    console.log('[pipeline] runError');
    this.runErrorCount += 1;
  }

  protected override onRunComplete(_context: Readonly<T>): void {
    console.log('[pipeline] runComplete');
  }
}

// ── Happy-path run: 3 stages that mutate step/value ───────────────────────────

const successPipeline = new TracingPipeline<StepContextTypeEntity.Type>([
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->alpha` }; },
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->beta` }; },
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->gamma` }; }
]);

console.log('\n--- happy path ---');
const successResult = await successPipeline.run(StepContextTypeEntity.create({ 'step': 0, 'value': 'start' }));
console.log(`result: step=${successResult.step} value=${successResult.value}`);

// ── Failing run: 2 stages where the second throws ────────────────────────────

const failPipeline = new TracingPipeline<StepContextTypeEntity.Type>([
  (context) => { return { 'step': context.step + 1, 'value': `${context.value}->alpha` }; },
  (_context) => { throw RuntimeError.create('stage 1 fails'); }
]);

console.log('\n--- failing path ---');
try {
  await failPipeline.run(StepContextTypeEntity.create({ 'step': 0, 'value': 'start' }));
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`caught: ${message}`);
}
// #endregion usage

// ── Assertions ────────────────────────────────────────────────────────────────

// Success pipeline: 3 stages all started and succeeded
assert.strictEqual(successPipeline.stageStartEvents.length, 3);
assert.strictEqual(successPipeline.stageSuccessEvents.length, 3);
assert.strictEqual(successPipeline.stageErrorIndexes.length, 0);
assert.strictEqual(successPipeline.runErrorCount, 0);

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
assert.strictEqual(failPipeline.stageErrorIndexes.length, 1);
assert.strictEqual(failPipeline.stageErrorIndexes[0], 1);
assert.strictEqual(failPipeline.runErrorCount, 1);


console.log('observedPipeline: all assertions passed');
