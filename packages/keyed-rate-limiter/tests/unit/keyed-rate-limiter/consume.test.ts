/**
 * KeyedRateLimiter#consume Unit Tests
 *
 * Verifies per-key isolation and exhaustion behavior for the default
 * TokenBucket-per-key path.
 */

import { strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { TokenBucketExhaustedError } from '@studnicky/resilience';

import { KeyedRateLimiter } from '../../../src/index.js';

it('two different keys have fully independent limits', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 1, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a');
  throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);

  // key B is untouched by key A's exhaustion
  limiter.consume('user-b');
});

it('repeated consume() on the same key past its limit throws', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 2, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-c');
  limiter.consume('user-c');
  throws(() => { limiter.consume('user-c'); }, TokenBucketExhaustedError);
});

it('consume(key, tokens) consumes the requested count in one call', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 5, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-d', 5);
  throws(() => { limiter.consume('user-d', 1); }, TokenBucketExhaustedError);
});

it('the same key reuses the same underlying strategy instance across calls', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 3, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-e');
  const firstBucket = limiter.getCache().get('user-e');
  limiter.consume('user-e');
  const secondBucket = limiter.getCache().get('user-e');

  strictEqual(firstBucket, secondBucket);
});
