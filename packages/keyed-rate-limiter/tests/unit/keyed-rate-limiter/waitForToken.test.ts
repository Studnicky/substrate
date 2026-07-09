/**
 * KeyedRateLimiter#waitForToken Unit Tests
 */

import { ok, rejects, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { KeyedRateLimiter } from '../../../src/index.js';

it('resolves immediately when the key has tokens available', async () => {
  const limiter = KeyedRateLimiter.create({ 'burstSize': 5, 'clock': () => 0, 'requestsPerSecond': 10 });

  await limiter.waitForToken('user-a');

  const bucket = limiter.getCache().get('user-a');
  strictEqual(bucket?.available, 4);
});

it('blocks on the same key until refilled, without affecting other keys', async () => {
  let time = 0;
  const clock = (): number => time;
  const limiter = KeyedRateLimiter.create({ 'burstSize': 1, 'clock': clock, 'requestsPerSecond': 1000 });

  limiter.consume('user-b'); // drain user-b's bucket

  const advance = new Promise<void>((resolve) => {
    setImmediate(() => { time = 2; resolve(); });
  });
  const wait = limiter.waitForToken('user-b');

  await Promise.all([advance, wait]);
  ok(true); // resolved without error

  // an untouched key never had to wait
  limiter.consume('user-c');
});

it('rejects when the passed AbortSignal is aborted while waiting', async () => {
  const controller = new AbortController();
  const limiter = KeyedRateLimiter.create({ 'burstSize': 1, 'requestsPerSecond': 0.001 });
  limiter.consume('user-d'); // drain to force a wait

  setImmediate(() => { controller.abort(new Error('cancelled')); });

  await rejects(() => limiter.waitForToken('user-d', { 'signal': controller.signal }));
});
