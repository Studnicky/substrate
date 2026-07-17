/**
 * KeyedRateLimiter Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onKeyCreated/onLimitExceeded/onTokenAcquired
 * observes the right events at the right times, on the default TokenBucket
 * (`create()`) path.
 */

import { deepStrictEqual, doesNotThrow, strictEqual, throws } from 'node:assert/strict';
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

it('a throwing onKeyCreated hook does not replace a successful consume()', () => {
  class ThrowingCreatedLimiter extends KeyedRateLimiter {
    protected override onKeyCreated(): void {
      throw new Error('onKeyCreated boom');
    }
  }

  const limiter = ThrowingCreatedLimiter.create({
    'burstSize': 1,
    'requestsPerSecond': 1,
    'clock': () => 0
  }) as ThrowingCreatedLimiter;

  doesNotThrow(() => {
    limiter.consume('user-a');
  });
});

it('a throwing onTokenAcquired hook does not replace a successful consume()', () => {
  class ThrowingAcquiredLimiter extends KeyedRateLimiter {
    protected override onTokenAcquired(): void {
      throw new Error('onTokenAcquired boom');
    }
  }

  const limiter = ThrowingAcquiredLimiter.create({
    'burstSize': 1,
    'requestsPerSecond': 1,
    'clock': () => 0
  }) as ThrowingAcquiredLimiter;

  limiter.consume('user-a');
  strictEqual(limiter.getCache().has('user-a'), true);
});

it('a throwing onLimitExceeded hook does not replace the underlying exhaustion error', () => {
  class ThrowingExceededLimiter extends KeyedRateLimiter {
    protected override onLimitExceeded(): void {
      throw new Error('onLimitExceeded boom');
    }
  }

  const limiter = ThrowingExceededLimiter.create({
    'burstSize': 1,
    'requestsPerSecond': 1,
    'clock': () => 0
  }) as ThrowingExceededLimiter;

  limiter.consume('user-a');

  throws(() => {
    limiter.consume('user-a');
  }, TokenBucketExhaustedError);
});

// ---------------------------------------------------------------------------
// Regression: `this.hooks.invoke('onX', () => { this.onX(...); })` call sites
// (and the cross-instance `limiter.hooks.invoke(...)` sites used by the
// delegating TokenBucket/LruCache) must return the hook's own result so
// HookInvoker can detect an async override and route its eventual rejection
// through onHookError, rather than discarding it and letting it become an
// unhandled rejection.
// ---------------------------------------------------------------------------

it('an async-overridden onKeyCreated that rejects is swallowed by onHookError and never surfaces as an unhandled rejection', async () => {
  class AsyncRejectingCreatedLimiter extends KeyedRateLimiter {
    protected override async onKeyCreated(): Promise<void> {
      await Promise.resolve();
      throw new Error('async onKeyCreated boom');
    }
  }

  const limiter = AsyncRejectingCreatedLimiter.create({
    'burstSize': 1,
    'requestsPerSecond': 1,
    'clock': () => 0
  }) as AsyncRejectingCreatedLimiter;

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    doesNotThrow(() => {
      limiter.consume('user-a');
    });
    strictEqual(limiter.getCache().has('user-a'), true);

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
