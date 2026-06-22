import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('timeout validation', () => {
  void it('should reject non-number timeout', () => {
    assert.throws(() => {
      FetchClient.create({ timeout: '5000' as never });
    }, /timeout must be a number/u);
  });

  void it('should reject negative timeout', () => {
    assert.throws(() => {
      FetchClient.create({ timeout: -1 });
    }, /timeout must be positive/u);
  });

  void it('should reject infinite timeout', () => {
    assert.throws(() => {
      FetchClient.create({ timeout: Infinity });
    }, /timeout must be finite/u);
  });

  void it('should accept valid timeout', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({ timeout: 5000 });
    });
  });

  void it('should reject zero timeout', () => {
    assert.throws(() => {
      FetchClient.create({ timeout: 0 });
    }, /timeout must be positive/u);
  });
});
