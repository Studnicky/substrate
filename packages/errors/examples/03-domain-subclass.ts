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
    const optionsData: ModuleErrorOptionsInterface = {
      'cause': options?.cause,
      'code': 'STORAGE_ERROR',
      'context': options?.context,
      'retryable': false,
      'statusCode': 500
    };
    const result = new StorageError(message, optionsData);
    return result;
  }

  protected override serializeExtra(): Record<string, unknown> {
    return { 'domain': 'storage' };
  }

  protected override formatUserMessage(): string {
    const result = String.raw`Storage unavailable. Please try again later.`;
    return result;
  }
}

const error = StorageError.create('Write failed', { 'context': { 'bucket': 'uploads', 'key': 'img.png' } });

console.log('StorageError.name:', error.name);
console.log('StorageError.code:', error.code);
console.log('StorageError.statusCode:', error.statusCode);
console.log('StorageError.toUserMessage():', error.toUserMessage());

const json = error.toJSON();
console.log('toJSON().domain:', json.domain);
console.log('toJSON().name:', json.name);

// Wrapping: inspect the canonical BaseError cause chain
const outer = ModuleError.create('Operation failed', {
  'cause': error,
  'scenario': 'INTERNAL'
});

const found = BaseError.getCauseChain(outer).find((cause) => {
  const result = cause instanceof StorageError;
  return result;
});
console.log('StorageError in cause chain:', found?.code);
// #endregion usage

assert.ok(error instanceof StorageError, 'instanceof StorageError');
assert.ok(error instanceof ModuleError, 'instanceof ModuleError');
assert.ok(error instanceof BaseError, 'instanceof BaseError');
assert.strictEqual(error.name, 'StorageError', 'name = class name');
assert.strictEqual(error.code, 'STORAGE_ERROR');
assert.strictEqual(error.statusCode, 500);
assert.strictEqual(error.retryable, false);
assert.strictEqual(error.toUserMessage(), 'Storage unavailable. Please try again later.');
assert.strictEqual(json.domain, 'storage', 'serializeExtra() in toJSON()');
assert.strictEqual(json.name, 'StorageError');
assert.ok(found instanceof StorageError, 'BaseError.getCauseChain() found StorageError');
assert.strictEqual(found?.code, 'STORAGE_ERROR');

console.log('03-domain-subclass: all assertions passed');
