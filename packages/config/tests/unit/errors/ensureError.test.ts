import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorGuard } from '../../../src/errors/ensureError.js';

void describe('ensureError', () => {
  void it('returns the same Error instance when given an Error', () => {
    const original = new Error('original');
    const result = ErrorGuard.ensureError(original);
    assert.strictEqual(result, original);
  });

  void it('wraps a string in an Error', () => {
    const result = ErrorGuard.ensureError('something went wrong');
    assert.ok(result instanceof Error);
    assert.strictEqual(result.message, 'something went wrong');
  });

  void it('wraps a number in an Error', () => {
    const result = ErrorGuard.ensureError(42);
    assert.ok(result instanceof Error);
    assert.strictEqual(result.message, '42');
  });

  void it('wraps null in an Error', () => {
    const result = ErrorGuard.ensureError(null);
    assert.ok(result instanceof Error);
    assert.strictEqual(result.message, 'null');
  });

  void it('wraps undefined in an Error', () => {
    const result = ErrorGuard.ensureError(undefined);
    assert.ok(result instanceof Error);
    assert.strictEqual(result.message, 'undefined');
  });

  void it('wraps an object in an Error using String()', () => {
    const result = ErrorGuard.ensureError({ code: 404 });
    assert.ok(result instanceof Error);
    assert.strictEqual(result.message, '[object Object]');
  });

  void it('preserves subclass Error instances', () => {
    class CustomError extends Error {}
    const custom = new CustomError('custom');
    const result = ErrorGuard.ensureError(custom);
    assert.strictEqual(result, custom);
    assert.ok(result instanceof CustomError);
  });
});
