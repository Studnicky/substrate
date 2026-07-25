import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LruCacheNodeTimingEntity } from '../../../src/index.js';

void describe('LruCacheNodeTimingEntity', () => {
  void it('accepts non-negative expiry and staleness timestamps', () => {
    assert.equal(LruCacheNodeTimingEntity.validate({ 'expiresAt': 0, 'staleAt': Date.now() }), true);
  });

  void it('rejects missing or negative timestamps', () => {
    assert.equal(LruCacheNodeTimingEntity.validate({ 'expiresAt': 0 }), false);
    assert.equal(LruCacheNodeTimingEntity.validate({ 'expiresAt': -1, 'staleAt': 0 }), false);
  });
});
