import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RateLimitRequestEntity } from '../../../src/entities/RateLimitRequestEntity.js';

void describe('RateLimitRequestEntity', () => {
  void it('fills tokens with the schema-declared default when omitted', () => {
    const result = RateLimitRequestEntity.intake({ 'key': 'account-1' });
    assert.equal(result.tokens, 1);
  });

  void it('keeps an explicit tokens value', () => {
    const result = RateLimitRequestEntity.intake({ 'key': 'account-1', 'tokens': 5 });
    assert.equal(result.tokens, 5);
  });

  void it('rejects a non-positive tokens value', () => {
    assert.throws(() => {
      RateLimitRequestEntity.intake({ 'key': 'account-1', 'tokens': 0 });
    });
  });
});
