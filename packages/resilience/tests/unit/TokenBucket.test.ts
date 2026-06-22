/**
 * TokenBucket Unit Tests
 */

import { ok, rejects, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TokenBucket } from '../../src/TokenBucket.js';
import { TokenBucketExhaustedError } from '../../src/TokenBucketExhaustedError.js';

void describe('TokenBucket', () => {
  void describe('constructor validation', () => {
    void it('throws RangeError for requestsPerSecond <= 0', () => {
      throws(() => { new TokenBucket({ requestsPerSecond: 0, burstSize: 1 }); }, RangeError);
    });

    void it('throws RangeError for burstSize < 1', () => {
      throws(() => { new TokenBucket({ requestsPerSecond: 1, burstSize: 0 }); }, RangeError);
    });
  });

  void describe('consume()', () => {
    void it('succeeds when tokens are available', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 5 });
      bucket.consume();
      bucket.consume();
      // no throw — 3 tokens remain
    });

    void it('throws TokenBucketExhaustedError when exhausted', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 2 });
      bucket.consume();
      bucket.consume();
      throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
    });

    void it('consumes multiple tokens at once', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 3 });
      bucket.consume(3);
      throws(() => { bucket.consume(1); }, TokenBucketExhaustedError);
    });
  });

  void describe('available getter', () => {
    void it('returns burstSize initially', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 5 });
      strictEqual(bucket.available, 5);
    });

    void it('decrements after consume', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 5 });
      bucket.consume(2);
      strictEqual(bucket.available, 3);
    });

    void it('refills over time with injectable clock', () => {
      let time = 0;
      const clock = (): number => time;
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 10, clock });
      bucket.consume(10); // drain all
      strictEqual(bucket.available, 0);

      time = 500; // 500 ms → 5 new tokens
      ok(bucket.available >= 4); // allow floating point tolerance
    });

    void it('does not exceed burstSize when refilling', () => {
      let time = 0;
      const clock = (): number => time;
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 5, clock });
      time = 10_000; // 10 seconds → would add 100 tokens, capped at 5
      strictEqual(bucket.available, 5);
    });
  });

  void describe('waitForToken()', () => {
    void it('resolves immediately when tokens are available', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10, burstSize: 5 });
      await bucket.waitForToken();
      ok(bucket.available <= 4);
    });

    void it('waits until refilled with injectable clock', async () => {
      let time = 0;
      const clock = (): number => time;
      const bucket = new TokenBucket({ requestsPerSecond: 1000, burstSize: 1, clock });
      bucket.consume(); // drain

      // Advance clock concurrently so waitForToken resolves
      const advance = new Promise<void>((resolve) => {
        setImmediate(() => { time = 2; resolve(); });
      });
      const wait = bucket.waitForToken();
      await Promise.all([advance, wait]);
      ok(true); // resolved without error
    });

    void it('rejects when AbortSignal is aborted', async () => {
      const controller = new AbortController();
      const bucket = new TokenBucket({ requestsPerSecond: 0.001, burstSize: 1 });
      bucket.consume(); // drain to force a wait

      setImmediate(() => { controller.abort(new Error('cancelled')); });
      await rejects(() => bucket.waitForToken(1, controller.signal));
    });
  });
});
