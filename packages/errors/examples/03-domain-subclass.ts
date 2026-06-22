/**
 * Domain-specific error subclass extending ModuleError.
 *
 * Demonstrates: subclass with static create(), serializeExtra(), findCauseOfType().
 *
 * Run: npx tsx packages/errors/examples/03-domain-subclass.ts
 */
import assert from 'node:assert/strict';

import { BaseError, ModuleError } from '../src/index.js';
import type { ModuleErrorOptionsType } from '../src/index.js';

class StorageError extends ModuleError {
  static override create(
    message: string,
    options?: { cause?: Error; context?: Record<string, unknown> }
  ): StorageError {
    const opts: ModuleErrorOptionsType = {
      code: 'STORAGE_ERROR',
      cause: options?.cause,
      context: options?.context,
      retryable: false,
      statusCode: 500
    };
    return new StorageError(message, opts);
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { domain: 'storage' };
  }

  protected override formatUserMessage(): string {
    return `Storage unavailable. Please try again later.`;
  }
}

const err = StorageError.create('Write failed', { context: { bucket: 'uploads', key: 'img.png' } });

assert.ok(err instanceof StorageError, 'instanceof StorageError');
assert.ok(err instanceof ModuleError, 'instanceof ModuleError');
assert.ok(err instanceof BaseError, 'instanceof BaseError');

assert.strictEqual(err.name, 'StorageError', 'name = class name');
assert.strictEqual(err.code, 'STORAGE_ERROR');
assert.strictEqual(err.statusCode, 500);
assert.strictEqual(err.retryable, false);
assert.strictEqual(err.toUserMessage(), 'Storage unavailable. Please try again later.');

const json = err.toJSON();
assert.strictEqual(json.domain, 'storage', 'serializeExtra() in toJSON()');
assert.strictEqual(json.name, 'StorageError');

// Wrapping: findCauseOfType finds StorageError in a chain
const outer = ModuleError.create('Operation failed', {
  scenario: 'INTERNAL',
  cause: err
});

const found = outer.findCauseOfType(StorageError);
assert.ok(found instanceof StorageError, 'findCauseOfType(StorageError) found it');
assert.strictEqual(found?.code, 'STORAGE_ERROR');

console.log('StorageError.name:', err.name);
console.log('StorageError.code:', err.code);
console.log('StorageError.toUserMessage():', err.toUserMessage());
console.log('findCauseOfType(StorageError):', found?.code);
