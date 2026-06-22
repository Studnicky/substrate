/**
 * LogBody and LogFault fluent builders.
 *
 * Demonstrates: required fields, optional duration, fromError(), build() output shape.
 *
 * Run: npx tsx packages/logger/examples/02-log-builders.ts
 */
import assert from 'node:assert/strict';

import {
  LogBody, LogFault, NoOpLogger, SpyLogger
} from '../src/index.js';

const spy = SpyLogger.wrap(NoOpLogger.create());

// LogBody — all required fields
const body = LogBody.create()
  .component('pipeline')
  .operation('process')
  .status('success')
  .message('Batch processed')
  .context({ batchSize: 100 })
  .duration(230)
  .build();

assert.strictEqual(body.event, 'pipeline.process', 'event = component.operation');
assert.strictEqual(body.message, 'Batch processed');
assert.strictEqual(body.status, 'success');
assert.strictEqual(body.context.batchSize, 100);
assert.strictEqual(body.durationMs, 230);

spy.info(body);
assert.strictEqual(spy.entries[0]?.message, 'Batch processed');

// LogFault — fromError() convenience
const originalError = new Error('Connection reset');
const fault = LogFault.create()
  .component('pipeline')
  .operation('process')
  .status('failed')
  .fromError(originalError)
  .context({ batchId: 'b-42' })
  .build();

assert.strictEqual(fault.event, 'pipeline.process');
assert.strictEqual(fault.name, 'Error', 'fromError() extracts error.name');
assert.strictEqual(fault.message, 'Connection reset', 'fromError() extracts error.message');
assert.strictEqual(fault.status, 'failed');

spy.error(fault);
assert.strictEqual(spy.flush().length, 2, 'Both entries captured');

// LogBody build() throws on missing required fields
assert.throws(
  () => LogBody.create().build(),
  (err: Error) => err.constructor.name === 'LogBuildError',
  'build() throws LogBuildError when required fields are missing'
);

console.log('LogBody: event=pipeline.process, status=success, durationMs=230');
console.log('LogFault: fromError() extracted name and message correctly');
console.log('LogBody.build() throws LogBuildError when required fields are missing');
