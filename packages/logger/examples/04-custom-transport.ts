/**
 * Custom transport implementing TransportInterface.
 *
 * Demonstrates: TransportInterface, ParseLogLevel.parse() for constructor-time
 * level resolution, and batching records before flush.
 *
 * Run: npx tsx packages/logger/examples/04-custom-transport.ts
 */

import assert from 'node:assert/strict';

import type { LogRecordEntity, TransportInterface } from '../src/index.js';

// #region usage
import { LogBody, Logger, ParseLogLevel } from '../src/index.js';

class BufferedTransport implements TransportInterface {
  readonly #batch: LogRecordEntity.Type[] = [];
  readonly #batchSize: number;
  readonly #minLevel: number;
  readonly #sink: (batch: readonly LogRecordEntity.Type[]) => void;

  constructor(sink: (batch: readonly LogRecordEntity.Type[]) => void, options: { 'batchSize'?: number; 'level'?: string } = {}) {
    this.#sink = sink;
    this.#batchSize = options.batchSize ?? 2;
    this.#minLevel = ParseLogLevel.parse(options.level ?? 'trace');
  }

  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minLevel) {
      return;
    }
    this.#batch.push(record);
    if (this.#batch.length >= this.#batchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.#batch.length === 0) {
      return;
    }
    this.#sink(this.#batch.splice(0, this.#batch.length));
  }
}

const flushed: LogRecordEntity.Type[][] = [];
const buffered = new BufferedTransport((batch) => { const result = flushed.push([...batch]); return result; }, { 'batchSize': 2, 'level': 'info' });

const logger = Logger.create({
  'level': 'trace',
  'transports': [buffered]
});

const body = LogBody.create({
  'component': 'worker',
  'context': { 'jobId': 'j-1' },
  'message': 'Job processed',
  'operation': 'process',
  'status': 'success'
});

logger.info(body);

console.log('flushed batches after one record:', flushed.length);

logger.info(body);

console.log('flushed batches after two records:', flushed.length);
console.log('records in first flushed batch:', flushed[0]?.length);
// #endregion usage

assert.strictEqual(flushed.length, 1, 'Batch flushes once batchSize is reached');
assert.strictEqual(flushed[0]?.length, 2, 'Flushed batch contains both records');

console.log('04-custom-transport: all assertions passed');
