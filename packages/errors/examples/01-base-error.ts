import assert from 'node:assert/strict';
/** 01-base-error — BaseError subclass with code, timestamp, retryable, toJSON(), toUserMessage(). Run: npx tsx packages/errors/examples/01-base-error.ts */

import { RuntimeError } from '../src/errors/RuntimeError.js';
// #region usage
import { BaseError } from '../src/index.js';

class AppError extends BaseError {
  public constructor(argumentList: { 'cause'?: Error; 'code': string; 'message': string; 'retryable': boolean }) {
    super(argumentList);
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { 'domain': 'app' };
  }

  protected override formatUserMessage(): string {
    const result = String.raw`Application error: ${this.message}`;
    return result;
  }
}

const error = new AppError({ 'code': 'app.failure', 'message': 'Something failed', 'retryable': false });

console.log('AppError.code:', error.code);
console.log('AppError.timestamp:', error.timestamp);
console.log('AppError.retryable:', error.retryable);
console.log('AppError.toUserMessage():', error.toUserMessage());

const json = error.toJSON();
console.log('AppError.toJSON().code:', json.code);
console.log('AppError.toJSON().domain:', json.domain);

const cause = RuntimeError.create('DB connection refused');
const wrapped = new AppError({ 'cause': cause, 'code': 'app.queryFailed', 'message': 'Query failed', 'retryable': false });
const chain = BaseError.getCauseChain(wrapped);
const firstCause = chain[0];
const secondCause = chain[1];

if (!(firstCause instanceof Error) || !(secondCause instanceof Error)) {
  throw RuntimeError.create('cause chain contains a non-error value');
}

console.log('Cause chain length:', chain.length);
console.log('Cause chain[0]:', firstCause.message);
console.log('Cause chain[1]:', secondCause.message);
// #endregion usage

assert.ok(error instanceof AppError, 'instanceof AppError');
assert.ok(error instanceof BaseError, 'instanceof BaseError');
assert.ok(error instanceof Error, 'instanceof Error');
assert.strictEqual(error.code, 'app.failure');
assert.strictEqual(error.retryable, false);
assert.ok(typeof error.timestamp === 'number' && error.timestamp > 0, 'timestamp is a positive number');
assert.strictEqual(error.toUserMessage(), 'Application error: Something failed');
assert.strictEqual(json.code, 'app.failure');
assert.strictEqual(json.domain, 'app', 'serializeExtra() merged into toJSON()');
assert.strictEqual(chain.length, 2, 'Cause chain has 2 nodes');
assert.strictEqual(firstCause.message, 'Query failed');
assert.strictEqual(secondCause.message, 'DB connection refused');

console.log('01-base-error: all assertions passed');
