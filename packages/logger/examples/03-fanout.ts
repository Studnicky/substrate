/**
 * FanOutLogger — broadcast to multiple logger targets.
 *
 * Demonstrates: FanOutLogger.create([primary, spy]), every call reaches both.
 *
 * Run: npx tsx packages/logger/examples/03-fanout.ts
 */
import assert from 'node:assert/strict';

import {
  FanOutLogger, LogBody, NoOpLogger, SpyLogger
} from '../src/index.js';

const spyA = SpyLogger.wrap(NoOpLogger.create());
const spyB = SpyLogger.wrap(NoOpLogger.create());
const fanOut = FanOutLogger.create([spyA, spyB]);

const body = LogBody.create()
  .component('router')
  .operation('handle')
  .status('success')
  .message('Request routed')
  .context({ route: '/api/users' })
  .build();

fanOut.info(body);

assert.strictEqual(spyA.entries.length, 1, 'spyA received the log');
assert.strictEqual(spyB.entries.length, 1, 'spyB received the log');
assert.strictEqual(spyA.entries[0]?.message, 'Request routed');
assert.strictEqual(spyB.entries[0]?.message, 'Request routed');

// Child fan-out
const child = fanOut.child({ requestId: 'req-999' });
child.info(body);

assert.strictEqual(spyA.entries.length, 2, 'spyA received child log');
assert.strictEqual(spyB.entries.length, 2, 'spyB received child log');

console.log(`FanOutLogger: ${spyA.entries.length} entries in spyA, ${spyB.entries.length} entries in spyB`);
console.log('Both targets received every broadcast including child logger calls');
