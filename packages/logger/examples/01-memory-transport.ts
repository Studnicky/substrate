/**
 * MemoryTransport for test assertion — captures log records without output.
 *
 * Demonstrates: Logger.create(), MemoryTransport, .info()/.error(),
 * .records(), .clear(), .child()
 *
 * Run: npx tsx packages/logger/examples/01-memory-transport.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { LogBody, LogFault, Logger, MemoryTransport } from '../src/index.js';

const memory = MemoryTransport.create();
const logger = Logger.create({
  'level': 'trace',
  'transports': [memory]
});

const body = LogBody.create()
  .component('example')
  .operation('run')
  .status('success')
  .message('Example executed')
  .context({ 'step': 1 })
  .build();

logger.info(body);

console.log('records after info:', memory.records().length);
console.log('captured message:', memory.records()[0]?.data.message);

// Error entry via LogFault
const fault = LogFault.create()
  .component('example')
  .operation('run')
  .status('failed')
  .name('ExampleError')
  .message('Something went wrong')
  .context({ 'code': 'E001' })
  .build();

logger.error(fault);

console.log('records after error:', memory.records().length);

// clear() empties the buffer
memory.clear();

console.log('records after clear:', memory.records().length);

// Child logger shares transports with parent
const child = logger.child({ 'requestId': 'req-001', 'service': 'auth' });

child.info(body);

console.log('records after child write:', memory.records().length);
console.log('child metadata.service:', memory.records()[0]?.metadata.service);
// #endregion usage

assert.strictEqual(memory.records().length, 1, 'One record from child');
assert.strictEqual(memory.records()[0]?.data.message, 'Example executed', 'Captured message matches');
assert.strictEqual(memory.records()[0]?.metadata.service, 'auth', 'Child metadata in record');
assert.strictEqual(memory.records()[0]?.metadata.requestId, 'req-001', 'requestId in record');

console.log('01-memory-transport: all assertions passed');
