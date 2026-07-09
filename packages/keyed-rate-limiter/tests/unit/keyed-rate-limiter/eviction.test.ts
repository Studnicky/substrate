/**
 * KeyedRateLimiter idle-key eviction Unit Tests
 *
 * Verifies both capacity-based and TTL-based eviction actually remove the
 * per-key strategy, firing `onKeyEvicted` and causing the next `consume()`
 * for that key to lazily build a fresh strategy.
 */

import { deepStrictEqual, notStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { KeyedRateLimiter } from '../../../src/index.js';

class TrackingLimiter extends KeyedRateLimiter {
  readonly created: string[] = [];
  readonly evicted: string[] = [];

  protected override onKeyCreated(key: string): void {
    this.created.push(key);
  }

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }
}

it('fires onKeyEvicted when the LRU cache evicts a key past capacity', () => {
  // `create()` uses the polymorphic `new this(...)` idiom, so calling it
  // through the subclass reference returns a `TrackingLimiter` instance with
  // its own hook overrides wired — no casting or prototype surgery needed.
  const limiter = TrackingLimiter.create({ 'burstSize': 1, 'maxKeys': 2, 'requestsPerSecond': 1 }) as TrackingLimiter;

  limiter.consume('user-a');
  limiter.consume('user-b');
  limiter.consume('user-c'); // evicts user-a (LRU tail)

  deepStrictEqual(limiter.created, ['user-a', 'user-b', 'user-c']);
  deepStrictEqual(limiter.evicted, ['user-a']);
});

it('a fresh strategy is created for a key after it is evicted for capacity', () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 1, 'maxKeys': 2, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a');
  const firstBucket = limiter.getCache().get('user-a');

  limiter.consume('user-b');
  limiter.consume('user-c'); // evicts user-a

  strictEqual(limiter.getCache().get('user-a'), undefined);

  limiter.consume('user-a'); // recreated
  const secondBucket = limiter.getCache().get('user-a');

  notStrictEqual(firstBucket, secondBucket);
});

it('idle key past keyIdleTtlMs is lazily expired and rebuilt fresh on next consume()', async () => {
  // `LruCache`'s TTL bookkeeping is always real wall-clock time (`Date.now()`)
  // — it has no injectable clock of its own, unlike `TokenBucket`. So this
  // waits on a real (short) timer rather than advancing a fake clock.
  const limiter = TrackingLimiter.create({
    'burstSize': 1,
    'keyIdleTtlMs': 5,
    'requestsPerSecond': 1
  }) as TrackingLimiter;

  limiter.consume('user-a');
  const firstBucket = limiter.getCache().get('user-a');

  await new Promise<void>((resolve) => { setTimeout(resolve, 20); });

  // has() lazily evicts the expired entry, firing onKeyEvicted via onExpire
  strictEqual(limiter.getCache().has('user-a'), false);
  deepStrictEqual(limiter.evicted, ['user-a']);

  limiter.consume('user-a'); // rebuilt fresh
  const secondBucket = limiter.getCache().get('user-a');

  notStrictEqual(firstBucket, secondBucket);
});
