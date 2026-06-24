/** 02-module-error — ModuleError with scenario defaults, context, and cause-chain helpers. Run: npx tsx packages/errors/examples/02-module-error.ts */

import assert from 'node:assert/strict';

// #region usage
import { ErrorDefaults, ModuleError } from '../src/index.js';

// Create from scenario — defaults supply code, statusCode, retryable
const notFound = ModuleError.create('User not found', {
  'context': { 'userId': 'u-456' },
  'scenario': 'NOT_FOUND'
});

console.log('ModuleError NOT_FOUND: code=%s, statusCode=%d, retryable=%s', notFound.code, notFound.statusCode, notFound.retryable);

// Retryable connection error
const connErr = ModuleError.create('Service unreachable', {
  'context': { 'host': 'db.internal', 'port': 5432 },
  'scenario': 'CONNECTION'
});

console.log('ModuleError CONNECTION: retryable=%s, statusCode=%d', connErr.retryable, connErr.statusCode);

// Cause chain
const cause = new Error('ETIMEDOUT');
const wrapped = ModuleError.create('Request timed out', {
  'cause': cause,
  'scenario': 'TIMEOUT'
});

const chain = wrapped.getCauseChain();
console.log('Cause chain length:', chain.length);

// toJSON serialization
const json = notFound.toJSON();
console.log('toJSON().name:', json.name);
console.log('toJSON().code:', json.code);
// #endregion usage

assert.strictEqual(notFound.code, ErrorDefaults.NOT_FOUND.code);
assert.strictEqual(notFound.statusCode, 404);
assert.strictEqual(notFound.retryable, false);
assert.deepStrictEqual(notFound.context, { 'userId': 'u-456' });
assert.strictEqual(connErr.retryable, true);
assert.strictEqual(connErr.statusCode, 503);
assert.strictEqual(wrapped.cause, cause, '.cause is the original error');
assert.ok(wrapped.hasCauseOfType(Error), 'hasCauseOfType(Error) = true');
assert.strictEqual(chain.length, 2, 'chain has 2 nodes');
assert.strictEqual(json.name, 'ModuleError');
assert.strictEqual(json.code, ErrorDefaults.NOT_FOUND.code);
assert.ok('stack' in json, 'toJSON includes stack');

console.log('02-module-error: all assertions passed');
