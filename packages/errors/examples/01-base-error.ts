/** 01-base-error — BaseError subclass with code, timestamp, retryable, toJSON(), toUserMessage(). Run: npx tsx packages/errors/examples/01-base-error.ts */

import assert from 'node:assert/strict';

// #region usage
import { BaseError } from '../src/index.js';

class AppError extends BaseError {
  static of(message: string, code: string, cause?: Error): AppError {
    return new AppError({ 'cause': cause, 'code': code, 'message': message, 'retryable': false });
  }

  protected override serializeExtra(): Record<string, unknown> {
    const extra: Record<string, unknown> = { 'domain': 'app' };
    return extra;
  }

  protected override formatUserMessage(): string {
    const result = `Application error: ${this.message}`;
    return result;
  }
}

const err = AppError.of('Something failed', 'app.failure');

console.log('AppError.code:', err.code);
console.log('AppError.timestamp:', err.timestamp);
console.log('AppError.retryable:', err.retryable);
console.log('AppError.toUserMessage():', err.toUserMessage());

const json = err.toJSON();
console.log('AppError.toJSON().code:', json.code);
console.log('AppError.toJSON().domain:', json.domain);

const cause = new Error('DB connection refused');
const wrapped = AppError.of('Query failed', 'app.queryFailed', cause);
const chain = BaseError.getCauseChain(wrapped);

console.log('Cause chain length:', chain.length);
console.log('Cause chain[0]:', (chain[0] as Error).message);
console.log('Cause chain[1]:', (chain[1] as Error).message);
// #endregion usage

assert.ok(err instanceof AppError, 'instanceof AppError');
assert.ok(err instanceof BaseError, 'instanceof BaseError');
assert.ok(err instanceof Error, 'instanceof Error');
assert.strictEqual(err.code, 'app.failure');
assert.strictEqual(err.retryable, false);
assert.ok(typeof err.timestamp === 'number' && err.timestamp > 0, 'timestamp is a positive number');
assert.strictEqual(err.toUserMessage(), 'Application error: Something failed');
assert.strictEqual(json.code, 'app.failure');
assert.strictEqual(json.domain, 'app', 'serializeExtra() merged into toJSON()');
assert.strictEqual(chain.length, 2, 'Cause chain has 2 nodes');
assert.strictEqual((chain[0] as Error).message, 'Query failed');
assert.strictEqual((chain[1] as Error).message, 'DB connection refused');

console.log('01-base-error: all assertions passed');
