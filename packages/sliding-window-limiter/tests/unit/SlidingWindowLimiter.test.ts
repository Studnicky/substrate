/**
 * SlidingWindowLimiter Unit Tests
 */

import { ok, rejects, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { SlidingWindowLimiterConfigError } from '../../src/errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from '../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiter } from '../../src/SlidingWindowLimiter.js';
import type { SlidingWindowLimiterOptionsInterface } from '../../src/interfaces/SlidingWindowLimiterOptionsInterface.js';

const ALGORITHMS = ['log', 'counter'] as const;

// --- Constructor validation ---

const invalidConfigs: Array<{ description: string; config: { limit: number; windowMs: number; algorithm: 'log' | 'counter' } }> = [
  { description: 'throws SlidingWindowLimiterConfigError for limit < 1', config: { limit: 0, windowMs: 1000, algorithm: 'log' } },
  { description: 'throws SlidingWindowLimiterConfigError for windowMs <= 0', config: { limit: 5, windowMs: 0, algorithm: 'log' } },
  { description: 'throws SlidingWindowLimiterConfigError for non-integer limit', config: { limit: 1.5, windowMs: 1000, algorithm: 'log' } },
];

for (const { description, config } of invalidConfigs) {
  it(description, () => {
    throws(() => { SlidingWindowLimiter.create(config); }, SlidingWindowLimiterConfigError);
  });
}

// --- Per-algorithm behavior ---

for (const algorithm of ALGORITHMS) {
  it(`[${algorithm}] requests within limit succeed`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = SlidingWindowLimiter.create({ limit: 3, windowMs: 100, algorithm, clock });
    limiter.consume();
    limiter.consume();
    limiter.consume();
    // no throw — 3 requests admitted, at limit
  });

  it(`[${algorithm}] the (limit+1)th request within windowMs throws SlidingWindowExhaustedError`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = SlidingWindowLimiter.create({ limit: 3, windowMs: 100, algorithm, clock });
    limiter.consume();
    limiter.consume();
    limiter.consume();
    throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);
  });

  it(`[${algorithm}] requests succeed again after windowMs elapses`, () => {
    let time = 0;
    const clock = (): number => time;
    const limiter = SlidingWindowLimiter.create({ limit: 2, windowMs: 100, algorithm, clock });
    limiter.consume();
    limiter.consume();
    throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);

    // 'log' is exact — any instant fully past the window (100ms) clears it.
    // 'counter' is an approximate blend that decays across the *next* fixed
    // window, so it needs to be near the far edge of that window (199ms)
    // before the previous window's count has decayed enough to admit again.
    time = algorithm === 'log' ? 101 : 199;
    limiter.consume(); // succeeds — old window's requests no longer count (or have decayed to near-zero)
  });

  it(`[${algorithm}] waitForToken rejects when AbortSignal is aborted`, async () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = SlidingWindowLimiter.create({ limit: 1, windowMs: 1000, algorithm, clock });
    limiter.consume(); // exhaust

    const controller = new AbortController();
    setImmediate(() => { controller.abort(new Error('cancelled')); });
    await rejects(() => limiter.waitForToken({ signal: controller.signal }));
  });
}

// --- waitForToken: blocks until capacity frees up, then succeeds ---

it('[log] waitForToken blocks until capacity frees up then succeeds', async () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = SlidingWindowLimiter.create({ limit: 1, windowMs: 50, algorithm: 'log', clock });
  limiter.consume(); // exhaust the single slot

  // Advance the clock concurrently past the window so waitForToken resolves
  // on its next retry — a single jump is sufficient because 'log' pruning
  // is exact: any instant past the window admits again.
  const advance = new Promise<void>((resolve) => {
    setImmediate(() => { time = 51; resolve(); });
  });
  const wait = limiter.waitForToken();
  await Promise.all([advance, wait]);
  ok(true); // resolved without error
});

it('[counter] waitForToken blocks until capacity frees up then succeeds', async () => {
  // The blended-counter estimate decays continuously across the window, so
  // this uses the real wall clock (no injected clock) with a short window —
  // waitForToken's own polling loop naturally observes the decay across
  // several retries, unlike a single fake-clock jump.
  const limiter = SlidingWindowLimiter.create({ limit: 1, windowMs: 30, algorithm: 'counter' });
  limiter.consume(); // exhaust the single slot
  await limiter.waitForToken();
  ok(true); // resolved without error
});

// --- 'log' algorithm exactness ---

it("[log] prunes only stale entries, keeping fresh ones within the window", () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = SlidingWindowLimiter.create({ limit: 2, windowMs: 100, algorithm: 'log', clock });
  limiter.consume(); // t=0
  time = 60;
  limiter.consume(); // t=60 — both within window, at limit
  throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);

  time = 101; // t=0 entry now stale (>100ms old), t=60 entry still fresh
  limiter.consume(); // succeeds — only the stale entry was pruned
  throws(() => { limiter.consume(); }, SlidingWindowExhaustedError); // back at limit (t=60, t=101)
});

// --- 'counter' algorithm blending ---

it('[counter] blends previous window count by elapsed fraction', () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = SlidingWindowLimiter.create({ limit: 4, windowMs: 100, algorithm: 'counter', clock });
  limiter.consume();
  limiter.consume();
  limiter.consume();
  limiter.consume(); // 4 requests in window [0, 100)
  throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);

  time = 150; // 50% into the next window — previous count blends at 50%: 4 * 0.5 = 2
  limiter.consume();
  limiter.consume();
  // effective estimate now ~ 2 (blended) + 2 (current) = 4, at limit
  throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);
});

// --- Lifecycle hooks ---

class ObservedLimiter extends SlidingWindowLimiter {
  readonly events: Array<{ type: string; value?: number }> = [];
  constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
  protected override onAllow(count: number): void { this.events.push({ type: 'allow', value: count }); }
  protected override onReject(count: number): void { this.events.push({ type: 'reject', value: count }); }
  protected override onWindowRoll(): void { this.events.push({ type: 'windowRoll' }); }
}

for (const algorithm of ALGORITHMS) {
  it(`[${algorithm}] onAllow fires after a successful consume()`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = new ObservedLimiter({ limit: 2, windowMs: 100, algorithm, clock });
    limiter.consume();
    strictEqual(limiter.events[0]?.type, 'allow');
  });

  it(`[${algorithm}] onReject fires before throw when limit exceeded`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = new ObservedLimiter({ limit: 1, windowMs: 100, algorithm, clock });
    limiter.consume();
    throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);
    ok(limiter.events.some((e) => { return e.type === 'reject'; }));
  });
}

it('[log] onWindowRoll fires when stale entries are pruned', () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = new ObservedLimiter({ limit: 1, windowMs: 100, algorithm: 'log', clock });
  limiter.consume(); // t=0
  time = 101;
  limiter.events.length = 0;
  limiter.consume(); // prunes the stale t=0 entry before admitting
  ok(limiter.events.some((e) => { return e.type === 'windowRoll'; }));
});

it('[counter] onWindowRoll fires when the fixed-window index changes', () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = new ObservedLimiter({ limit: 5, windowMs: 100, algorithm: 'counter', clock });
  limiter.consume(); // window index 0
  limiter.events.length = 0;
  time = 150; // window index 1
  limiter.consume();
  ok(limiter.events.some((e) => { return e.type === 'windowRoll'; }));
});

// --- Structural compatibility with the keyed-rate-limiter strategy seam ---

it('consume(tokens?) and waitForToken(options?) accept the token-bucket-shaped signature without error', async () => {
  const limiter = SlidingWindowLimiter.create({ limit: 5, windowMs: 1000, algorithm: 'log' });
  limiter.consume(1); // tokens accepted, ignored — still one admitted request
  await limiter.waitForToken({ tokens: 1 });
});

// --- Builder ---

it('builder constructs an equivalent limiter to create()', () => {
  const time = 0;
  const clock = (): number => time;
  const limiter = SlidingWindowLimiter.builder()
    .withLimit(1)
    .withWindowMs(100)
    .withAlgorithm('log')
    .withClock(clock)
    .build();
  limiter.consume();
  throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);
});

it('builder throws SlidingWindowLimiterConfigError when required fields are missing', () => {
  throws(() => { SlidingWindowLimiter.builder().withWindowMs(100).withAlgorithm('log').build(); }, SlidingWindowLimiterConfigError);
  throws(() => { SlidingWindowLimiter.builder().withLimit(1).withAlgorithm('log').build(); }, SlidingWindowLimiterConfigError);
  throws(() => { SlidingWindowLimiter.builder().withLimit(1).withWindowMs(100).build(); }, SlidingWindowLimiterConfigError);
});

class ThrowingAllowLimiter extends SlidingWindowLimiter {
  protected override onAllow(): void {
    throw new Error('onAllow boom');
  }
}

class ThrowingRejectLimiter extends SlidingWindowLimiter {
  protected override onReject(): void {
    throw new Error('onReject boom');
  }
}

class ThrowingWindowRollLimiter extends SlidingWindowLimiter {
  protected override onWindowRoll(): void {
    throw new Error('onWindowRoll boom');
  }
}

for (const algorithm of ALGORITHMS) {
  it(`[${algorithm}] a throwing onAllow hook does not replace a successful consume()`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = ThrowingAllowLimiter.create({ limit: 1, windowMs: 100, algorithm, clock });

    limiter.consume();
  });

  it(`[${algorithm}] a throwing onReject hook does not replace SlidingWindowExhaustedError`, () => {
    const time = 0;
    const clock = (): number => time;
    const limiter = ThrowingRejectLimiter.create({ limit: 1, windowMs: 100, algorithm, clock });
    limiter.consume();

    throws(() => { limiter.consume(); }, SlidingWindowExhaustedError);
  });
}

it('[log] a throwing onWindowRoll hook does not replace rollover admission', () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = ThrowingWindowRollLimiter.create({ limit: 1, windowMs: 100, algorithm: 'log', clock });
  limiter.consume();

  time = 101;
  limiter.consume();
});

it('[counter] a throwing onWindowRoll hook does not replace rollover admission', () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = ThrowingWindowRollLimiter.create({ limit: 4, windowMs: 100, algorithm: 'counter', clock });
  limiter.consume();
  limiter.consume();

  time = 150;
  limiter.consume();
});

// --- Async hook overrides: HookInvoker's async-safety net must actually see the hook's return value ---

class AsyncRejectingAllowLimiter extends SlidingWindowLimiter {
  get recordedHookErrors(): readonly Error[] { return this.hookErrors; }
  protected override async onAllow(): Promise<void> {
    await Promise.resolve();
    throw new Error('async onAllow boom');
  }
}

it('[log] an async-rejecting onAllow override is routed through onHookError without producing an unhandled rejection', async () => {
  const time = 0;
  const clock = (): number => time;
  const limiter = AsyncRejectingAllowLimiter.create({ limit: 1, windowMs: 100, algorithm: 'log', clock });
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    limiter.consume(); // fire-and-forget hook — must not throw or block despite the async rejection
    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
    strictEqual(limiter.recordedHookErrors.length, 1);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
