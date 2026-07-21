import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BackoffConfigEntity } from '../../../src/entities/BackoffConfigEntity.js';
import { RetryContextDataEntity } from '../../../src/entities/RetryContextDataEntity.js';

void describe('retry entity contracts', () => {
  void it('validates backoff configuration data', () => {
    assert.strictEqual(BackoffConfigEntity.validate({ 'baseDelayMs': 25 }), true);
    assert.strictEqual(BackoffConfigEntity.validate({ 'baseDelayMs': -1 }), false);
  });

  void it('validates retry context data', () => {
    assert.strictEqual(RetryContextDataEntity.validate({
      'abort': false,
      'attemptNumber': 1,
      'delayMs': 25,
      'elapsedMs': 100
    }), true);
    assert.strictEqual(RetryContextDataEntity.validate({
      'attemptNumber': -1,
      'delayMs': 25,
      'elapsedMs': 100
    }), false);
  });
});
