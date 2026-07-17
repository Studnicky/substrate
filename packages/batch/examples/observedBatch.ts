/** observedBatch — trace batch progress by subclassing Batch and overriding lifecycle hooks. Run: npx tsx examples/observedBatch.ts */

import assert from 'node:assert/strict';

// #region usage
import type { BatchStatsEntity } from '../src/index.js';

import { Batch } from '../src/index.js';
import { ObservedBatchFixture } from './fixtures/ObservedBatchFixture.js';

class ObservedBatch extends Batch<string> {
  public readonly capturedItemStarts: number[] = [];
  public readonly capturedSuccesses: { 'index': number; 'value': string }[] = [];
  public readonly capturedErrors: { 'index': number; 'message': string }[] = [];
  public readonly capturedSettled: number[] = [];
  public capturedSaturations = 0;
  public capturedStats: BatchStatsEntity.Type | undefined;

  public constructor(maxConcurrent?: number) { super(maxConcurrent); }

  protected override onBatchStart(total: number): void {
    console.log(`[batch] start — ${total} items`);
  }

  protected override onBatchComplete(stats: BatchStatsEntity.Type): void {
    console.log(`[batch] complete — total=${stats.total} succeeded=${stats.succeeded} failed=${stats.failed}`);
    this.capturedStats = stats;
  }

  protected override onConcurrencySaturated(): void {
    console.log('[batch] concurrency saturated — all slots in use');
    this.capturedSaturations++;
  }

  protected override onItemError(index: number, error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    console.log(`[batch] item[${index}] error — ${msg}`);
    this.capturedErrors.push({ 'index': index, 'message': msg });
  }

  protected override onItemSettled(index: number): void {
    console.log(`[batch] item[${index}] settled`);
    this.capturedSettled.push(index);
  }

  protected override onItemStart(index: number): void {
    console.log(`[batch] item[${index}] start`);
    this.capturedItemStarts.push(index);
  }

  protected override onItemSuccess(index: number, result: string): void {
    console.log(`[batch] item[${index}] success → ${result}`);
    this.capturedSuccesses.push({ 'index': index, 'value': result });
  }
}

class ObservedBatchExample {
  static async run(): Promise<void> {
    const observed = new ObservedBatch(2);
    const allSettled: PromiseSettledResult<string>[] = [];

    for await (const batchResults of observed.processSettled(
      ObservedBatchFixture.Tasks,
      (task) => {
        if (task.id === 3) {
          return Promise.reject(new Error(`task ${task.id} (${task.label}) failed`));
        }
        return Promise.resolve(`processed-${task.label}`);
      }
    )) {
      allSettled.push(...batchResults);
    }
    // #endregion usage

    // ── post-run assertions ───────────────────────────────────────────────────────

    // onItemStart fired for all 5 items; indices cover 0–4
    assert.strictEqual(observed.capturedItemStarts.length, 5, 'onItemStart must fire for every item');
    assert.deepStrictEqual(
      observed.capturedItemStarts.slice().sort((a, b) => { return a - b; }),
      [0, 1, 2, 3, 4]
    );

    // onItemSuccess: 4 items succeed (ids 1,2,4,5 → indices 0,1,3,4)
    assert.strictEqual(observed.capturedSuccesses.length, 4, 'onItemSuccess must fire for 4 successes');

    const successIndices: number[] = [];
    for (const e of observed.capturedSuccesses) {
      successIndices.push(e.index);
    }
    successIndices.sort((a, b) => { return a - b; });

    assert.deepStrictEqual(successIndices, [0, 1, 3, 4]);

    // onItemError: 1 item fails (index 2)
    assert.strictEqual(observed.capturedErrors.length, 1, 'onItemError must fire exactly once');
    assert.strictEqual(observed.capturedErrors[0]!.index, 2);
    assert.ok(observed.capturedErrors[0]!.message.includes('gamma'));

    // onItemSettled: fires for all 5 items
    assert.strictEqual(observed.capturedSettled.length, 5, 'onItemSettled must fire for every item');

    // onConcurrencySaturated: 2 full batches of 2 out of batches [0,1],[2,3],[4]
    assert.strictEqual(observed.capturedSaturations, 2, 'onConcurrencySaturated must fire for each full batch');

    // onBatchComplete: once, after processSettled finishes all batches
    assert.ok(observed.capturedStats !== undefined, 'onBatchComplete must fire');
    assert.deepStrictEqual(observed.capturedStats, { 'failed': 1, 'succeeded': 4, 'total': 5 });

    // processSettled produces 5 settled results
    assert.strictEqual(allSettled.length, 5);

    console.log('observedBatch: all assertions passed');
  }
}

await ObservedBatchExample.run();
