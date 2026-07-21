import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  KeyedRateLimiterRegistryOptionsEntity,
  RateLimitRequestEntity
} from '../../src/index.js';

describe('keyed-rate-limiter entities', () => {
  it('validate registry bounds and rate-limit requests', () => {
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate({
      'keyIdleTtlMs': 1_000,
      'maxKeys': 100
    }), true);
    assert.equal(RateLimitRequestEntity.validate({ 'key': 'user-1', 'tokens': 2 }), true);
  });

  it('rejects invalid bounds and token counts', () => {
    assert.equal(KeyedRateLimiterRegistryOptionsEntity.validate({ 'maxKeys': 0 }), false);
    assert.equal(RateLimitRequestEntity.validate({ 'key': 'user-1', 'tokens': 0 }), false);
  });
});
