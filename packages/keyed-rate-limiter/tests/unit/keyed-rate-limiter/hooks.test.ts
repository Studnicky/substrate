/**
 * KeyedRateLimiter Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onKeyCreated/onLimitExceeded/onTokenAcquired
 * observes the right events at the right times, on the default TokenBucket
 * (`create()`) path.
 */

import { deepStrictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { TokenBucketExhaustedError } from '@studnicky/resilience';

import { KeyedRateLimiter } from '../../../src/index.js';

class TrackingLimiter extends KeyedRateLimiter {
  readonly created: string[] = [];
  readonly exceeded: string[] = [];
  readonly acquired: Array<{ key: string; count: number }> = [];

  protected override onKeyCreated(key: string): void {
    this.created.push(key);
  }

  protected override onLimitExceeded(key: string): void {
    this.exceeded.push(key);
  }

  protected override onTokenAcquired(key: string, count: number): void {
    this.acquired.push({ key, count });
  }
}

const tracked = (config: { burstSize: number; requestsPerSecond: number; clock?: () => number }): TrackingLimiter => {
  return TrackingLimiter.create(config) as TrackingLimiter;
};

it('fires onKeyCreated exactly once per genuinely new key', () => {
  const limiter = tracked({ 'burstSize': 5, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a');
  limiter.consume('user-a');
  limiter.consume('user-b');

  deepStrictEqual(limiter.created, ['user-a', 'user-b']);
});

it('fires onTokenAcquired with the acquired count on the default TokenBucket path', () => {
  const limiter = tracked({ 'burstSize': 5, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a', 2);
  limiter.consume('user-a', 1);

  deepStrictEqual(limiter.acquired, [
    { 'count': 2, 'key': 'user-a' },
    { 'count': 1, 'key': 'user-a' }
  ]);
});

it('fires onLimitExceeded (not onTokenAcquired) right before consume() throws', () => {
  const limiter = tracked({ 'burstSize': 1, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a');

  throws(() => { limiter.consume('user-a'); }, TokenBucketExhaustedError);

  deepStrictEqual(limiter.exceeded, ['user-a']);
  deepStrictEqual(limiter.acquired, [{ 'count': 1, 'key': 'user-a' }]);
});
