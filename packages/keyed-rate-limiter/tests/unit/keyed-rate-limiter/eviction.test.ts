/**
 * KeyedRateLimiter idle-key eviction Unit Tests
 *
 * Verifies both capacity-based and TTL-based eviction actually remove the
 * per-key strategy, firing `onKeyEvicted` and causing the next `consume()`
 * for that key to lazily build a fresh strategy.
 */

import { deepStrictEqual, ok } from 'node:assert/strict';
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
  const limiter = TrackingLimiter.create({ 'burstSize': 1, 'maxKeys': 2, 'requestsPerSecond': 1 });
  ok(limiter instanceof TrackingLimiter);

  limiter.consume('user-a');
  limiter.consume('user-b');
  limiter.consume('user-c'); // evicts user-a (LRU tail)

  deepStrictEqual(limiter.created, ['user-a', 'user-b', 'user-c']);
  deepStrictEqual(limiter.evicted, ['user-a']);
});

it('a fresh strategy is created for a key after it is evicted for capacity', () => {
  const limiter = TrackingLimiter.create({ 'burstSize': 1, 'maxKeys': 2, 'requestsPerSecond': 1, 'clock': () => 0 });

  limiter.consume('user-a');
  limiter.consume('user-b');
  limiter.consume('user-c'); // evicts user-a
  limiter.consume('user-a'); // recreated

  deepStrictEqual(limiter.created, ['user-a', 'user-b', 'user-c', 'user-a']);
  deepStrictEqual(limiter.evicted, ['user-a', 'user-b']);
});

it('idle key past keyIdleTtlMs is lazily expired and rebuilt fresh on next consume()', async () => {
  // `LruCache`'s TTL bookkeeping is always real wall-clock time (`Date.now()`)
  // — it has no injectable clock of its own, unlike `TokenBucket`. So this
  // waits on a real (short) timer rather than advancing a fake clock.
  const limiter = TrackingLimiter.create({
    'burstSize': 1,
    'keyIdleTtlMs': 5,
    'requestsPerSecond': 1
  });
  ok(limiter instanceof TrackingLimiter);

  limiter.consume('user-a');

  await new Promise<void>((resolve) => { setTimeout(resolve, 20); });

  limiter.consume('user-a'); // rebuilt fresh

  deepStrictEqual(limiter.evicted, ['user-a']);
  deepStrictEqual(limiter.created, ['user-a', 'user-a']);
});

it('a throwing onKeyEvicted hook does not replace the underlying eviction behavior', () => {
  class ThrowingEvictedLimiter extends KeyedRateLimiter {
    protected override onKeyEvicted(): void {
      throw new Error('onKeyEvicted boom');
    }
  }

  const limiter = ThrowingEvictedLimiter.create({
    'burstSize': 1,
    'maxKeys': 2,
    'requestsPerSecond': 1
  });
  ok(limiter instanceof ThrowingEvictedLimiter);

  limiter.consume('user-a');
  limiter.consume('user-b');
  limiter.consume('user-c');

  limiter.consume('user-a');
});
