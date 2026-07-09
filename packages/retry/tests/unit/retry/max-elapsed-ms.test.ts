/**
 * maxElapsedMs Unit Tests
 *
 * Verifies the optional time-ceiling field: Retry stops retrying once elapsed
 * wall-clock time since the first attempt exceeds maxElapsedMs, mirroring
 * Python tenacity's stop_after_attempt(N) | stop_after_delay(T) combined policy.
 * Whichever ceiling (attempts or time) is hit first wins.
 */

import {
  ok, rejects, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { Retry } from '../../../src/retry/index.js';
import { MaxRetriesExceededError } from '../../../src/errors/index.js';

// ---------------------------------------------------------------------------
// Backward compatibility — no maxElapsedMs configured
// ---------------------------------------------------------------------------

it('behaves exactly as before when maxElapsedMs is not configured', async () => {
  let attempts = 0;
  const retry = Retry.create({
    errorClassifier: () => ({ retryable: true }),
    maxRetries: 3
  });

  await rejects(
    () => retry.execute(async () => {
      attempts++;
      throw new Error('always fails');
    }),
    MaxRetriesExceededError
  );

  strictEqual(attempts, 4, 'should exhaust maxRetries (4 total attempts) with no time ceiling applied');
  strictEqual(retry.getStats().totalRetries, 3);
});

it('succeeds normally when maxElapsedMs is configured but never reached', async () => {
  const retry = Retry.create({
    errorClassifier: () => ({ retryable: true }),
    maxElapsedMs: 60_000,
    maxRetries: 3
  });

  const result = await retry.execute(async () => 'ok');
  strictEqual(result, 'ok');
});

// ---------------------------------------------------------------------------
// maxElapsedMs shorter than maxRetries alone would allow — time wins
// ---------------------------------------------------------------------------

it('exhausts via maxElapsedMs before maxRetries when the time ceiling is tighter', async () => {
  const maxElapsedMs = 60;
  let attempts = 0;

  const retry = Retry.create({
    errorClassifier: () => ({ retryable: true }),
    maxElapsedMs,
    // A generous attempt budget that would take far longer than maxElapsedMs
    // to exhaust, given the per-attempt delay below.
    maxRetries: 1000
  });

  const start = Date.now();

  await rejects(
    () => retry.execute(async () => {
      attempts++;
      // Small artificial per-attempt cost so elapsed time accumulates
      // deterministically across attempts.
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error('always fails');
    }),
    MaxRetriesExceededError
  );

  const elapsed = Date.now() - start;

  ok(attempts < 1000, `should give up via time ceiling well before exhausting 1000 retries, got ${attempts} attempts`);
  // Elapsed time should be close to the ceiling, not wildly beyond it — allow
  // slack for one in-flight attempt plus scheduling jitter.
  ok(elapsed < maxElapsedMs * 5, `elapsed ${elapsed}ms should not wildly exceed maxElapsedMs=${maxElapsedMs}ms`);
});

// ---------------------------------------------------------------------------
// maxElapsedMs longer than what maxRetries alone would take — count wins
// ---------------------------------------------------------------------------

it('exhausts via maxRetries when maxElapsedMs is a looser ceiling', async () => {
  let attempts = 0;

  const retry = Retry.create({
    errorClassifier: () => ({ retryable: true }),
    // Generous time budget that a fast-failing, low-retry-count loop will
    // never approach.
    maxElapsedMs: 60_000,
    maxRetries: 2
  });

  await rejects(
    () => retry.execute(async () => {
      attempts++;
      throw new Error('always fails');
    }),
    MaxRetriesExceededError
  );

  strictEqual(attempts, 3, 'should exhaust maxRetries (3 total attempts) since the time ceiling is never reached');
  strictEqual(retry.getStats().totalRetries, 2);
});
