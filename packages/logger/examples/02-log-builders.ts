/**
 * LogBody and LogFault fluent builders.
 *
 * Demonstrates: required fields, optional duration, fromError(), build() output shape.
 *
 * Run: npx tsx packages/logger/examples/02-log-builders.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { LogBody, LogFault, Logger, MemoryTransport } from '../src/index.js';

const memory = new MemoryTransport();
const logger = Logger.create({ 'level': 'trace', 'transports': [memory] });

// LogBody — all required fields
const body = LogBody.create()
  .component('pipeline')
  .operation('process')
  .status('success')
  .message('Batch processed')
  .context({ 'batchSize': 100 })
  .duration(230)
  .build();

console.log('body.event:', body.event);
console.log('body.status:', body.status);
console.log('body.durationMs:', body.durationMs);

logger.info(body);

console.log('logged message:', memory.records()[0]?.data.message);

// LogFault — fromError() convenience
const originalError = new Error('Connection reset');
const fault = LogFault.create()
  .component('pipeline')
  .operation('process')
  .status('failed')
  .fromError(originalError)
  .context({ 'batchId': 'b-42' })
  .build();

console.log('fault.name:', fault.name);
console.log('fault.message:', fault.message);

logger.error(fault);

memory.clear();

// LogBody build() throws on missing required fields
let buildError: Error | undefined;
try {
  LogBody.create().build();
} catch (err) {
  buildError = err as Error;
}

console.log('build error type:', buildError?.constructor.name);
// #endregion usage

assert.strictEqual(body.event, 'pipeline.process', 'event = component.operation');
assert.strictEqual(body.message, 'Batch processed');
assert.strictEqual(body.status, 'success');
assert.strictEqual(body.context.batchSize, 100);
assert.strictEqual(body.durationMs, 230);
assert.strictEqual(fault.event, 'pipeline.process');
assert.strictEqual(fault.name, 'Error', 'fromError() extracts error.name');
assert.strictEqual(fault.message, 'Connection reset', 'fromError() extracts error.message');
assert.strictEqual(fault.status, 'failed');
assert.strictEqual(buildError?.constructor.name, 'LogBuildError', 'build() throws LogBuildError when required fields are missing');

console.log('02-log-builders: all assertions passed');
