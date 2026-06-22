/**
 * SpyLogger for test assertion — captures log entries without output.
 *
 * Demonstrates: SpyLogger.wrap(), .info()/.error(), .entries, .flush(), .child()
 *
 * Run: npx tsx packages/logger/examples/01-spy-logger.ts
 */
import assert from 'node:assert/strict';

import {
  LogBody, LogFault, NoOpLogger, SpyLogger
} from '../src/index.js';

const spy = SpyLogger.wrap(NoOpLogger.create());

const body = LogBody.create()
  .component('example')
  .operation('run')
  .status('success')
  .message('Example executed')
  .context({ step: 1 })
  .build();

spy.info(body);

assert.strictEqual(spy.entries.length, 1, 'One entry captured');
assert.strictEqual(spy.entries[0]?.message, 'Example executed', 'Captured message matches');
assert.strictEqual(spy.entries[0]?.level, 'info', 'Level is info');

// Error entry via LogFault
const fault = LogFault.create()
  .component('example')
  .operation('run')
  .status('failed')
  .name('ExampleError')
  .message('Something went wrong')
  .context({ code: 'E001' })
  .build();

spy.error(fault);

assert.strictEqual(spy.entries.length, 2, 'Two entries captured');
assert.strictEqual(spy.entries[1]?.level, 'error', 'Second entry is error level');

// flush() returns and clears
const flushed = spy.flush();
assert.strictEqual(flushed.length, 2, 'flush() returned 2 entries');
assert.strictEqual(spy.entries.length, 0, 'Buffer is empty after flush');

// Child logger shares the parent buffer
const child = spy.child({ service: 'auth', requestId: 'req-001' });
child.info(body);

assert.strictEqual(spy.entries.length, 1, 'Child write captured on parent spy');
assert.ok('service' in (spy.entries[0]?.data ?? {}), 'Child metadata present in captured entry');

console.log('SpyLogger: entries captured, flushed, and child sharing buffer verified');
