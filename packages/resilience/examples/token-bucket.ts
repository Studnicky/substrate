/** token-bucket — consume() throws when exhausted; waitForToken() blocks until refill. Run: npx tsx examples/token-bucket.ts */

import assert from 'node:assert/strict';

// #region usage
import { TokenBucket, TokenBucketExhaustedError } from '../src/index.js';

// Deterministic clock: start at t=0, advance manually.
let now = 0;
class Clock {
  static now(): number { const result = now; return result; }
}

// 2 tokens/s, burst capacity 3 → starts full (3 tokens).
const bucket = TokenBucket.create({ 'burstSize': 3, 'clock': Clock.now, 'requestsPerSecond': 2 });
console.log('Initial available tokens:', bucket.available);

// --- consume() drains tokens ---
bucket.consume();
bucket.consume();
bucket.consume();
console.log('Available after 3 consumes:', bucket.available);

// --- Advance 500 ms → 1 new token (2 tokens/s × 0.5 s = 1) ---
now = 500;
console.log('Available at t=500ms:', bucket.available);
bucket.consume();

// --- Advance to 1500 ms → 2 tokens refilled, capped at burstSize=3 ---
now = 1_500;
console.log('Available at t=1500ms:', bucket.available);

// --- waitForToken with abort signal cancels correctly ---
// Drain remaining tokens so waitForToken has to block, then abort concurrently.
bucket.consume();
bucket.consume();
const controller = new AbortController();
const abortError = new Error('cancelled');
// Abort after a microtask so waitForToken is already suspended in the Promise.
const waitPromise = bucket.waitForToken({ 'signal': controller.signal, 'tokens': 1 });
queueMicrotask(() => { controller.abort(abortError); });
const abortRejected = await waitPromise.then(() => { const result = false; return result; }).catch(() => { const result = true; return result; });
console.log('waitForToken aborted:', abortRejected);
// #endregion usage

assert.equal(bucket.available, 0);
assert.throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
assert.equal(abortRejected, true);

console.log('token-bucket: all assertions passed');
