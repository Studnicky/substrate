/** observedWorkerPool — override the lifecycle hooks to collect telemetry. Run: npx tsx examples/observedWorkerPool.ts */

import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import type {
  WorkerErrorEnvelopeEntity,
  WorkerLogEnvelopeEntity,
  WorkerProgressEnvelopeEntity
} from '../src/entities/index.js';
// #region usage
import type { WorkerResultEnvelopeInterface } from '../src/interfaces/index.js';
import type { ItemEntity } from './entities/ItemEntity.js';

import { WorkerPool } from '../src/node/index.js';

class TelemetryWorkerPool extends WorkerPool<ItemEntity.Type, number> {
  readonly logs: string[] = [];
  readonly progressEvents: number[] = [];
  readonly errors: { 'index': number; 'message': string }[] = [];

  protected override onMessage(
    envelope:
      | WorkerErrorEnvelopeEntity.Type
      | WorkerLogEnvelopeEntity.Type
      | WorkerProgressEnvelopeEntity.Type
      | WorkerResultEnvelopeInterface<number>,
    index: number
  ): void {
    if (envelope.type === 'log') {
      console.log(`[worker ${String(index)}] ${envelope.message}`);
      this.logs.push(envelope.message);
    } else if (envelope.type === 'progress') {
      this.progressEvents.push(envelope.percent);
    }
  }

  protected override onWorkerError(error: Error, index: number): void {
    console.error('[worker] failed:', String(index), error.message);
    this.errors.push({ 'index': index, 'message': error.message });
  }
}

const pool = TelemetryWorkerPool.create<ItemEntity.Type, number, TelemetryWorkerPool>({
  'concurrency': 2,
  'workerPath': fileURLToPath(new URL('./observedWorkerPoolWorker.ts', import.meta.url))
});

const results = await pool.run([{ 'n': 1 }, { 'n': 2 }, { 'n': 3 }]);

console.log('Northstar Books fulfilment quotes (cents):', results);
// #endregion usage

assert.deepEqual(results, [495, 990, 1485]);
assert.equal(pool.logs.length, 3);
assert.equal(pool.progressEvents.length, 3);
assert.equal(pool.errors.length, 0);

console.log('observedWorkerPool: all assertions passed');
