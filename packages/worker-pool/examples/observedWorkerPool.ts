/** observedWorkerPool — override the lifecycle hooks to collect telemetry. Run: npx tsx examples/observedWorkerPool.ts */

import assert from 'node:assert/strict';

// #region usage
import type { WorkerEnvelopeType } from '../src/index.js';

import { WorkerPool } from '../src/index.js';

type ItemType = { 'n': number };

class TelemetryWorkerPool extends WorkerPool<ItemType, number> {
  readonly logs: string[] = [];
  readonly progressEvents: number[] = [];
  readonly errors: { 'index': number; 'message': string }[] = [];

  protected override onMessage(envelope: WorkerEnvelopeType<ItemType, number>, index: number): void {
    if (envelope.type === 'log') {
      console.log(`[worker ${String(index)}] ${envelope.message}`);
      this.logs.push(envelope.message);
    } else if (envelope.type === 'progress') {
      this.progressEvents.push(envelope.percent);
    }
  }

  protected override onWorkerError(error: Error, index: number): void {
    console.error(`[worker ${String(index)}] failed:`, error.message);
    this.errors.push({ 'index': index, 'message': error.message });
  }
}

const pool = TelemetryWorkerPool.create({
  'concurrency': 2,
  'workerPath': new URL('./observedWorkerPoolWorker.mjs', import.meta.url).pathname
}) as TelemetryWorkerPool;

const results = await pool.run([{ 'n': 5 }, { 'n': 10 }, { 'n': 15 }]);

console.log('Fibonacci results:', results);
// #endregion usage

assert.deepEqual(results, [5, 55, 610]);
assert.equal(pool.logs.length, 3);
assert.equal(pool.progressEvents.length, 3);
assert.equal(pool.errors.length, 0);

console.log('observedWorkerPool: all assertions passed');
