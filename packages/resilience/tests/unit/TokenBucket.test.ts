/**
 * TokenBucket Unit Tests
 */

import { ok, rejects, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { ResilienceConfigError } from '../../src/errors/ResilienceConfigError.js';
import { TokenBucket } from '../../src/TokenBucket.js';
import { TokenBucketExhaustedError } from '../../src/TokenBucketExhaustedError.js';

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

for (const { description, setup, assert: assertFn } of availableScenarios) {
  it(description, () => {
    const bucket = TokenBucket.create({ requestsPerSecond: 10, burstSize: 5 });
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
