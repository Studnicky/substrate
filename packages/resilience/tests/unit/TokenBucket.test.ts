/**
 * TokenBucket Unit Tests
 */

import type { HookInvocationError } from '@studnicky/errors';

import { ok, rejects, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { ResilienceConfigError } from '../../src/errors/ResilienceConfigError.js';
import { TokenBucket } from '../../src/TokenBucket.js';
import { TokenBucketExhaustedError } from '../../src/TokenBucketExhaustedError.js';
import type { TokenBucketOptionsInterface } from '../../src/interfaces/TokenBucketOptionsInterface.js';

// Constructor validation scenarios
const invalidConfigs: Array<{ description: string; config: { requestsPerSecond: number; burstSize: number } }> = [
  { description: 'throws ResilienceConfigError for requestsPerSecond <= 0', config: { requestsPerSecond: 0, burstSize: 1 } },
  { description: 'throws ResilienceConfigError for burstSize < 1', config: { requestsPerSecond: 1, burstSize: 0 } },
];

for (const { description, config } of invalidConfigs) {
  it(description, () => {
    throws(() => { TokenBucket.create(config); }, ResilienceConfigError);
  });
}

it('succeeds when tokens are available', () => {
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5 });
  bucket.consume();
  bucket.consume();
  // no throw — 3 tokens remain
});

it('throws TokenBucketExhaustedError when exhausted', () => {
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 2 });
  bucket.consume();
  bucket.consume();
  throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
});

it('consumes multiple tokens at once', () => {
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 3 });
  bucket.consume(3);
  throws(() => { bucket.consume(1); }, TokenBucketExhaustedError);
});

// available getter scenarios
const availableScenarios: Array<{
  description: string;
  setup: (bucket: TokenBucket) => void;
  assert: (bucket: TokenBucket) => void;
}> = [
  {
    description: 'available returns burstSize initially',
    setup: () => { /* no setup */ },
    assert: (bucket) => { strictEqual(bucket.available, 5); },
  },
  {
    description: 'available decrements after consume',
    setup: (bucket) => { bucket.consume(2); },
    assert: (bucket) => { strictEqual(bucket.available, 3); },
  },
];

// Frozen clock so the assertions see no time-based refill — the getter values
// are exact functions of setup alone.
const frozenClock = (): number => 0;

for (const { description, setup, assert: assertFn } of availableScenarios) {
  it(description, () => {
    const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5, clock: frozenClock });
    setup(bucket);
    assertFn(bucket);
  });
}

it('refills over time with injectable clock', () => {
  let time = 0;
  const clock = (): number => time;
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 10, clock });
  bucket.consume(10); // drain all
  strictEqual(bucket.available, 0);

  time = 500; // 500 ms → 5 new tokens
  ok(bucket.available >= 4); // allow floating point tolerance
});

it('does not exceed burstSize when refilling', () => {
  let time = 0;
  const clock = (): number => time;
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5, clock });
  time = 10_000; // 10 seconds → would add 100 tokens, capped at 5
  strictEqual(bucket.available, 5);
});

it('waitForToken resolves immediately when tokens are available', async () => {
  const clock = (): number => 0;
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5, clock });
  await bucket.waitForToken();  // uses default tokens: 1
  strictEqual(bucket.available, 4);
});

it('waitForToken waits until refilled with injectable clock', async () => {
  let time = 0;
  const clock = (): number => time;
  const bucket = TokenBucket.create({ requestsPerSecond: 1000, burstSize: 1, clock });
  bucket.consume(); // drain

  // Advance clock concurrently so waitForToken resolves
  const advance = new Promise<void>((resolve) => {
    setImmediate(() => { time = 2; resolve(); });
  });
  const wait = bucket.waitForToken();  // uses default tokens: 1
  await Promise.all([advance, wait]);
  ok(true); // resolved without error
});

it('waitForToken rejects when AbortSignal is aborted', async () => {
  const controller = new AbortController();
  const bucket = TokenBucket.create({ requestsPerSecond: 0.001, burstSize: 1 });
  bucket.consume(); // drain to force a wait

  setImmediate(() => { controller.abort(new Error('cancelled')); });
  await rejects(() => bucket.waitForToken({ 'tokens': 1, 'signal': controller.signal }));
});

it('waitForToken throws TokenBucketExhaustedError immediately when tokens exceed burstSize', async () => {
  const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5 });
  await rejects(() => bucket.waitForToken({ 'tokens': 6 }), TokenBucketExhaustedError);
});

it('waitForToken does not leak abort listeners on a long-lived signal across many calls', async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  let addCount = 0;
  let removeCount = 0;
  const originalAdd = signal.addEventListener.bind(signal);
  const originalRemove = signal.removeEventListener.bind(signal);
  signal.addEventListener = ((...args: Parameters<typeof originalAdd>) => { addCount += 1; return originalAdd(...args); }) as typeof signal.addEventListener;
  signal.removeEventListener = ((...args: Parameters<typeof originalRemove>) => { removeCount += 1; return originalRemove(...args); }) as typeof signal.removeEventListener;

  let time = 0;
  const clock = (): number => time;
  const bucket = TokenBucket.create({ requestsPerSecond: 1000, burstSize: 1, clock });
  bucket.consume(); // drain so the first waitForToken call must wait

  for (let i = 0; i < 5; i += 1) {
    const wait = bucket.waitForToken({ 'signal': signal });
    time += 2;
    await wait; // waitForToken consumes the refilled token, leaving 0 for the next iteration
  }

  strictEqual(addCount, 5);
  strictEqual(removeCount, 5);
});

// --- Lifecycle hook tests ---

class ObservedBucket extends TokenBucket {
  readonly events: Array<{ type: string; value?: number }> = [];
  constructor(options: TokenBucketOptionsInterface) { super(options); }
  protected override onTokenAcquired(count: number): void { this.events.push({ 'type': 'acquired', 'value': count }); }
  protected override onTokenDepleted(): void { this.events.push({ 'type': 'depleted' }); }
  protected override onRefill(added: number): void { this.events.push({ 'type': 'refill', 'value': added }); }
}

it('onTokenAcquired fires after consume()', () => {
  const bucket = new ObservedBucket({ requestsPerSecond: 10, burstSize: 5, clock: frozenClock });
  bucket.consume(2);
  strictEqual(bucket.events[0]?.type, 'acquired');
  strictEqual(bucket.events[0]?.value, 2);
});

it('onTokenDepleted fires before throw on exhausted consume()', () => {
  const bucket = new ObservedBucket({ requestsPerSecond: 10, burstSize: 2, clock: frozenClock });
  bucket.consume(2); // exhaust
  throws(() => { bucket.consume(1); }, TokenBucketExhaustedError);
  ok(bucket.events.some((e) => { return e.type === 'depleted'; }));
});

it('onRefill fires when tokens refilled by clock', () => {
  let time = 0;
  const clock = (): number => time;
  const bucket = new ObservedBucket({ requestsPerSecond: 10, burstSize: 10, clock });
  bucket.consume(10); // drain all
  bucket.events.length = 0; // clear acquire events
  time = 500; // 500 ms → ~5 new tokens
  // trigger refill via available getter
  const _avail = bucket.available;
  ok(bucket.events.some((e) => { return e.type === 'refill' && (e.value ?? 0) > 0; }));
});

it('onTokenAcquired fires after waitForToken()', async () => {
  const bucket = new ObservedBucket({ requestsPerSecond: 10, burstSize: 5, clock: frozenClock });
  await bucket.waitForToken();
  ok(bucket.events.some((e) => { return e.type === 'acquired'; }));
});

class ThrowingAcquiredBucket extends TokenBucket {
  protected override onTokenAcquired(): void {
    throw new Error('onTokenAcquired boom');
  }
}

class ThrowingDepletedBucket extends TokenBucket {
  protected override onTokenDepleted(): void {
    throw new Error('onTokenDepleted boom');
  }
}

class ThrowingRefillBucket extends TokenBucket {
  protected override onRefill(): void {
    throw new Error('onRefill boom');
  }
}

it('a throwing onTokenAcquired hook does not replace consume()', () => {
  const bucket = ThrowingAcquiredBucket.create({ requestsPerSecond: 10, burstSize: 3, clock: frozenClock });
  bucket.consume(2);

  strictEqual(bucket.available, 1);
});

it('a throwing onTokenAcquired hook does not replace waitForToken()', async () => {
  const bucket = ThrowingAcquiredBucket.create({ requestsPerSecond: 10, burstSize: 2, clock: frozenClock });
  await bucket.waitForToken({ 'tokens': 2 });

  strictEqual(bucket.available, 0);
});

it('a throwing onTokenDepleted hook does not replace TokenBucketExhaustedError', () => {
  const bucket = ThrowingDepletedBucket.create({ requestsPerSecond: 10, burstSize: 1, clock: frozenClock });
  bucket.consume();

  throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
});

it('a throwing onRefill hook does not replace the refilled token state', () => {
  let time = 0;
  const clock = (): number => time;
  const bucket = ThrowingRefillBucket.create({ requestsPerSecond: 10, burstSize: 5, clock });
  bucket.consume(5);

  time = 500;
  ok(bucket.available >= 4);
});

it('an async-overridden onTokenAcquired hook that rejects is routed to hookErrors without producing an unhandled rejection', async () => {
  class AsyncRejectingAcquiredBucket extends TokenBucket {
    get recordedHookErrors(): HookInvocationError[] { const result = this.hookErrors;
      return result; }

    protected override async onTokenAcquired(_count: number): Promise<void> {
      await Promise.resolve();
      throw new Error('async onTokenAcquired boom');
    }
  }

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const bucket = new AsyncRejectingAcquiredBucket({ requestsPerSecond: 10, burstSize: 5, clock: frozenClock });
    bucket.consume();

    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
    strictEqual(bucket.recordedHookErrors.length, 1);
    strictEqual(bucket.recordedHookErrors[0]?.hookName, 'onTokenAcquired');
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
