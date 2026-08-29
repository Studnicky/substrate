import assert from 'node:assert/strict';
/** 02-module-error — ModuleError with scenario defaults, context, and cause-chain helpers. Run: npx tsx packages/errors/examples/02-module-error.ts */

import { RuntimeError } from '../src/errors/RuntimeError.js';
// #region usage
import { BaseError, ErrorDefaults, ModuleError } from '../src/index.js';

// Create from scenario — defaults supply code, status, retryable
const notFound = ModuleError.create('User not found', {
  'context': { 'userId': 'u-456' },
  'scenario': 'NOT_FOUND'
});

console.log('ModuleError NOT_FOUND: code=%s, status=%d, retryable=%s', notFound.code, notFound.status, notFound.retryable);

// Retryable connection error
const connectionError = ModuleError.create('Service unreachable', {
  'context': { 'host': 'db.internal', 'port': 5432 },
  'scenario': 'CONNECTION'
});

console.log('ModuleError CONNECTION: retryable=%s, status=%d', connectionError.retryable, connectionError.status);

// Cause chain
const cause = RuntimeError.create('ETIMEDOUT');
const wrapped = ModuleError.create('Request timed out', {
  'cause': cause,
  'scenario': 'TIMEOUT'
});

const chain = BaseError.getCauseChain(wrapped);
console.log('Cause chain length:', chain.length);

// toJSON serialization
const json = notFound.toJSON();
console.log('toJSON().title:', json.title);
console.log('toJSON().code:', json.code);
// #endregion usage

assert.strictEqual(notFound.code, ErrorDefaults.NOT_FOUND.code);
assert.strictEqual(notFound.status, 404);
assert.strictEqual(notFound.retryable, false);
assert.deepStrictEqual(notFound.context, { 'userId': 'u-456' });
assert.strictEqual(connectionError.retryable, true);
assert.strictEqual(connectionError.status, 503);
assert.strictEqual(wrapped.cause, cause, '.cause is the original error');
assert.ok(BaseError.hasCauseOfType(wrapped, Error), 'BaseError.hasCauseOfType(wrapped, Error) = true');
assert.strictEqual(chain.length, 2, 'chain has 2 nodes');
assert.strictEqual(json.title, 'ModuleError');
assert.strictEqual(json.code, ErrorDefaults.NOT_FOUND.code);
assert.ok('stack' in json, 'toJSON includes stack');

console.log('02-module-error: all assertions passed');
