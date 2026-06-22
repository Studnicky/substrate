/**
 * ModuleError with scenario defaults, context, and cause-chain helpers.
 *
 * Demonstrates: ModuleError.create(), scenario defaults, toJSON(), getCauseChain().
 *
 * Run: npx tsx packages/errors/examples/02-module-error.ts
 */
import assert from 'node:assert/strict';

import {
  ErrorDefaults, ModuleError
} from '../src/index.js';

// Create from scenario — defaults supply code, statusCode, retryable
const notFound = ModuleError.create('User not found', {
  scenario: 'NOT_FOUND',
  context: { userId: 'u-456' }
});

assert.strictEqual(notFound.code, ErrorDefaults.NOT_FOUND.code);
assert.strictEqual(notFound.statusCode, 404);
assert.strictEqual(notFound.retryable, false);
assert.deepStrictEqual(notFound.context, { userId: 'u-456' });

// Retryable connection error
const connErr = ModuleError.create('Service unreachable', {
  scenario: 'CONNECTION',
  context: { host: 'db.internal', port: 5432 }
});

assert.strictEqual(connErr.retryable, true);
assert.strictEqual(connErr.statusCode, 503);

// Cause chain
const cause = new Error('ETIMEDOUT');
const wrapped = ModuleError.create('Request timed out', {
  scenario: 'TIMEOUT',
  cause
});

assert.strictEqual(wrapped.cause, cause, '.cause is the original error');
assert.ok(wrapped.hasCauseOfType(Error), 'hasCauseOfType(Error) = true');

const chain = wrapped.getCauseChain();
assert.strictEqual(chain.length, 2, 'chain has 2 nodes');

// toJSON serialization
const json = notFound.toJSON();
assert.strictEqual(json.name, 'ModuleError');
assert.strictEqual(json.code, ErrorDefaults.NOT_FOUND.code);
assert.ok('stack' in json, 'toJSON includes stack');

console.log('ModuleError NOT_FOUND: code=%s, statusCode=%d, retryable=%s', notFound.code, notFound.statusCode, notFound.retryable);
console.log('ModuleError CONNECTION: retryable=%s, statusCode=%d', connErr.retryable, connErr.statusCode);
console.log('Cause chain length:', chain.length);
