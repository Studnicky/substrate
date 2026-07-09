/**
 * Getter identity tests — strict identity, not deep equality
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { LruCache } from '@studnicky/cache';

import { KeyedRateLimiter } from '../../../src/index.js';

it('getCache() returns the exact composed LruCache instance', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 5, 'requestsPerSecond': 10 });

  const cache = limiter.getCache();

  strictEqual(cache instanceof LruCache, true);
  strictEqual(limiter.getCache(), cache);
});

it('builder() produces an equivalent limiter to create()', () => {
  const limiter = KeyedRateLimiter.builder()
    .withRequestsPerSecond(10)
    .withBurstSize(5)
    .withMaxKeys(3)
    .build();

  limiter.consume('user-a', 5);
  strictEqual(limiter.getCache().size, 1);
});
