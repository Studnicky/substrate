/** builder-logger — construct a Logger via the fluent builder API. Run: npx tsx packages/logger/examples/builder-logger.ts */

import assert from 'node:assert/strict';

// #region usage
import { LogBody } from '../src/modules/LogBody.js';
import { LogFault } from '../src/modules/LogFault.js';
import { Logger } from '../src/modules/Logger.js';
import { MemoryTransport } from '../src/transports/MemoryTransport.js';

// ---------------------------------------------------------------------------
// Build a Logger via the fluent builder
// ---------------------------------------------------------------------------

const memory = MemoryTransport.create();

const logger = Logger.builder()
  .withLevel('info')
  .withMetadata({ 'service': 'demo' })
  .withTransports([memory])
  .build();

console.log('[builder-logger] Logger constructed via builder');

// ---------------------------------------------------------------------------
// Log a structured info entry via LogBody
// ---------------------------------------------------------------------------

const infoBody = LogBody.create()
  .component('auth')
  .operation('login')
  .status('success')
  .message('User logged in')
  .context({ 'userId': 'u-001' })
  .duration(12)
  .build();

logger.info(infoBody);
console.log(`[builder-logger] info record captured — event=${infoBody.event} message=${infoBody.message}`);

// ---------------------------------------------------------------------------
// Log a fault entry via LogFault.create().fromError()
// ---------------------------------------------------------------------------

const cause = new Error('database connection refused');

const fault = LogFault.create()
  .component('db')
  .operation('connect')
  .status('failed')
  .fromError(cause)
  .context({ 'host': 'localhost', 'port': 5432 })
  .build();

logger.error(fault);
console.log(`[builder-logger] error record captured — event=${fault.event} name=${fault.name}`);

// ---------------------------------------------------------------------------
// Debug record is dropped because the logger floor is 'info'
// ---------------------------------------------------------------------------

const debugBody = LogBody.create()
  .component('auth')
  .operation('token-check')
  .status('success')
  .message('Token validated')
  .context({})
  .build();

logger.debug(debugBody);
console.log('[builder-logger] debug record dropped (below info floor)');

// #endregion usage

// Verify that the info and error records were captured
assert.strictEqual(memory.records().length, 2, 'expected 2 records (info + error)');

// Verify the first record is the info entry
const [infoRecord, errorRecord] = memory.records();
assert.ok(infoRecord !== undefined);
assert.strictEqual(infoRecord.data.event, 'auth.login');
assert.strictEqual(infoRecord.data.message, 'User logged in');
assert.deepStrictEqual(infoRecord.metadata, { 'service': 'demo' });

// Verify the second record is the fault entry
assert.ok(errorRecord !== undefined);
assert.strictEqual(errorRecord.data.event, 'db.connect');
assert.strictEqual(errorRecord.data.name, 'Error');

console.log('builder-logger: all assertions passed');
