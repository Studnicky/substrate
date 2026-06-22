/**
 * BaseError subclass — code, timestamp, retryable, toJSON(), toUserMessage().
 *
 * Demonstrates: extending BaseError, serializeExtra(), formatUserMessage(), cause chain.
 *
 * Run: npx tsx packages/errors/examples/01-base-error.ts
 */
import assert from 'node:assert/strict';

import { BaseError } from '../src/index.js';

class AppError extends BaseError {
  static of(message: string, code: string, cause?: Error): AppError {
    return new AppError({ message, code, cause, retryable: false });
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { domain: 'app' };
  }

  protected override formatUserMessage(): string {
    return `Application error: ${this.message}`;
  }
}

const err = AppError.of('Something failed', 'app.failure');

assert.ok(err instanceof AppError, 'instanceof AppError');
assert.ok(err instanceof BaseError, 'instanceof BaseError');
assert.ok(err instanceof Error, 'instanceof Error');

assert.strictEqual(err.code, 'app.failure');
assert.strictEqual(err.retryable, false);
assert.ok(typeof err.timestamp === 'number' && err.timestamp > 0, 'timestamp is a positive number');

// toUserMessage delegates to formatUserMessage()
assert.strictEqual(err.toUserMessage(), 'Application error: Something failed');

// toJSON includes serializeExtra() output
const json = err.toJSON();
assert.strictEqual(json.code, 'app.failure');
assert.strictEqual(json.domain, 'app', 'serializeExtra() merged into toJSON()');

// Cause chain
const cause = new Error('DB connection refused');
const wrapped = AppError.of('Query failed', 'app.queryFailed', cause);
const chain = BaseError.getCauseChain(wrapped);

assert.strictEqual(chain.length, 2, 'Cause chain has 2 nodes');
assert.strictEqual((chain[0] as Error).message, 'Query failed');
assert.strictEqual((chain[1] as Error).message, 'DB connection refused');

console.log('AppError.code:', err.code);
console.log('AppError.timestamp:', err.timestamp);
console.log('AppError.toUserMessage():', err.toUserMessage());
console.log('Cause chain length:', chain.length);
