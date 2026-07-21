/** 03-domain-subclass — Domain-specific error subclass extending ModuleError. Run: npx tsx packages/errors/examples/03-domain-subclass.ts */

import assert from 'node:assert/strict';

// #region usage
import type { ModuleErrorOptionsInterface } from '../src/index.js';

import { BaseError, ModuleError } from '../src/index.js';

class StorageError extends ModuleError {
  static override create(
    message: string,
    options?: { 'cause'?: Error; 'context'?: Record<string, unknown> }
  ): StorageError {
    const opts: ModuleErrorOptionsInterface = {
      'cause': options?.cause,
      'code': 'STORAGE_ERROR',
      'context': options?.context,
      'retryable': false,
      'statusCode': 500
    };
    return new StorageError(message, opts);
  }

  protected override serializeExtra(): Record<string, unknown> {
    const extra: Record<string, unknown> = { 'domain': 'storage' };
    return extra;
  }

  protected override formatUserMessage(): string {
    const result = 'Storage unavailable. Please try again later.';
    return result;
  }
}

const err = StorageError.create('Write failed', { 'context': { 'bucket': 'uploads', 'key': 'img.png' } });

console.log('StorageError.name:', err.name);
console.log('StorageError.code:', err.code);
console.log('StorageError.statusCode:', err.statusCode);
console.log('StorageError.toUserMessage():', err.toUserMessage());

const json = err.toJSON();
console.log('toJSON().domain:', json.domain);
console.log('toJSON().name:', json.name);

// Wrapping: inspect the canonical BaseError cause chain
const outer = ModuleError.create('Operation failed', {
  'cause': err,
  'scenario': 'INTERNAL'
});

const found = BaseError.getCauseChain(outer).find((cause) => { return cause instanceof StorageError; });
console.log('StorageError in cause chain:', found?.code);
// #endregion usage

assert.ok(err instanceof StorageError, 'instanceof StorageError');
assert.ok(err instanceof ModuleError, 'instanceof ModuleError');
assert.ok(err instanceof BaseError, 'instanceof BaseError');
assert.strictEqual(err.name, 'StorageError', 'name = class name');
assert.strictEqual(err.code, 'STORAGE_ERROR');
assert.strictEqual(err.statusCode, 500);
assert.strictEqual(err.retryable, false);
assert.strictEqual(err.toUserMessage(), 'Storage unavailable. Please try again later.');
assert.strictEqual(json.domain, 'storage', 'serializeExtra() in toJSON()');
assert.strictEqual(json.name, 'StorageError');
assert.ok(found instanceof StorageError, 'BaseError.getCauseChain() found StorageError');
assert.strictEqual(found?.code, 'STORAGE_ERROR');

console.log('03-domain-subclass: all assertions passed');
