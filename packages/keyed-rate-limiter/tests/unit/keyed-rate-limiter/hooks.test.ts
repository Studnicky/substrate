/**
 * KeyedRateLimiter Lifecycle Hooks Unit Tests
 *
 * Verifies subclass lifecycle observations, owner isolation, and failure
 * disposition on the default TokenBucket (`create()`) path.
 */

import { deepStrictEqual, doesNotThrow, ok, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { TokenBucketExhaustedError } from '@studnicky/resilience';

import { KeyedRateLimiter } from '../../../src/index.js';

class TrackingLimiter extends KeyedRateLimiter {
  readonly created: string[] = [];
  readonly evicted: string[] = [];
  readonly exceeded: string[] = [];
  readonly acquired: Array<{ key: string; count: number }> = [];

  protected override onKeyCreated(key: string): void {
    this.created.push(key);
  }

  protected override onLimitExceeded(key: string): void {
    this.exceeded.push(key);
  }

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }

  protected override onTokenAcquired(key: string, count: number): void {
    this.acquired.push({ key, count });
  }
}

const tracked = (config: {
  burstSize: number;
  requestsPerSecond: number;
  clock?: () => number;
  maxKeys?: number;
}): TrackingLimiter => {
  const limiter = TrackingLimiter.create(config);
  ok(limiter instanceof TrackingLimiter);
  return limiter;
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
  });
  ok(limiter instanceof ThrowingCreatedLimiter);

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
  });
  ok(limiter instanceof ThrowingAcquiredLimiter);

  doesNotThrow(() => { limiter.consume('user-a'); });
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
  });
  ok(limiter instanceof ThrowingExceededLimiter);

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
  });
  ok(limiter instanceof AsyncRejectingCreatedLimiter);

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    doesNotThrow(() => {
      limiter.consume('user-a');
    });

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });
    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('owned delegates retain their limiter owner when two instances use the same key', () => {
  const first = tracked({ 'burstSize': 2, 'maxKeys': 1, 'requestsPerSecond': 1, 'clock': () => 0 });
  const second = tracked({ 'burstSize': 2, 'maxKeys': 1, 'requestsPerSecond': 1, 'clock': () => 0 });

  first.consume('shared');
  second.consume('shared');

  deepStrictEqual(first.acquired, [{ 'count': 1, 'key': 'shared' }]);
  deepStrictEqual(second.acquired, [{ 'count': 1, 'key': 'shared' }]);

  first.consume('first-only');

  deepStrictEqual(first.evicted, ['shared']);
  deepStrictEqual(second.evicted, []);

  first.consume('shared');
  throws(() => { second.consume('shared', 2); }, TokenBucketExhaustedError);
  deepStrictEqual(first.created, ['shared', 'first-only', 'shared']);
  deepStrictEqual(second.created, ['shared']);
});

it('unexpected async rejections from both owned delegates remain isolated and never become unhandled', async () => {
  class AsyncRejectingOwnedDelegateLimiter extends KeyedRateLimiter {
    protected override async onKeyEvicted(): Promise<void> {
      await Promise.resolve();
      throw new Error('async onKeyEvicted boom');
    }

    protected override async onTokenAcquired(): Promise<void> {
      await Promise.resolve();
      throw new Error('async onTokenAcquired boom');
    }
  }

  const limiter = AsyncRejectingOwnedDelegateLimiter.create({
    'burstSize': 1,
    'maxKeys': 1,
    'requestsPerSecond': 1,
    'clock': () => 0
  });
  ok(limiter instanceof AsyncRejectingOwnedDelegateLimiter);

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    doesNotThrow(() => {
      limiter.consume('shared');
      limiter.consume('replacement');
    });

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
