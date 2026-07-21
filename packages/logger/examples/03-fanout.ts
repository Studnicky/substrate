/**
 * Fan-out to multiple transports via Logger.
 *
 * Demonstrates: Logger with multiple MemoryTransports, per-transport level
 * filtering, and child loggers reaching all transports.
 *
 * Run: npx tsx packages/logger/examples/03-fanout.ts
 */

import assert from 'node:assert/strict';

// #region usage
import { LogBody, Logger, MemoryTransport } from '../src/index.js';

const memoryAll = MemoryTransport.create({ 'level': 'trace' });
const memoryWarn = MemoryTransport.create({ 'level': 'warn' });

const logger = Logger.create({
  'level': 'trace',
  'transports': [memoryAll, memoryWarn]
});

const body = LogBody.create({
  'component': 'router',
  'context': { 'route': '/api/users' },
  'message': 'Request routed',
  'operation': 'handle',
  'status': 'success'
});

logger.info(body);

console.log('memoryAll after info:', memoryAll.records().length);
console.log('memoryWarn after info:', memoryWarn.records().length);

logger.warn(body);

console.log('memoryAll after warn:', memoryAll.records().length);
console.log('memoryWarn after warn:', memoryWarn.records().length);

// Child logger reaches all transports
const child = logger.child({ 'requestId': 'req-999' });

child.error(body);

console.log('memoryAll after child error:', memoryAll.records().length);
console.log('memoryWarn after child error:', memoryWarn.records().length);
console.log('child metadata.requestId:', memoryAll.records()[2]?.metadata.requestId);
// #endregion usage

assert.strictEqual(memoryAll.records().length, 3, 'memoryAll received all 3 records');
assert.strictEqual(memoryWarn.records().length, 2, 'memoryWarn received warn + error only');
assert.strictEqual(memoryAll.records()[2]?.metadata.requestId, 'req-999', 'child metadata on record');

console.log('03-fanout: all assertions passed');
