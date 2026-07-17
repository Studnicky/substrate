/**
 * hookTimeoutMs Unit Tests
 *
 * Verifies the optional hook-timeout field: when configured, each lifecycle
 * hook invocation races against `hookTimeoutMs`. A hook that never settles is
 * swallowed (per Retry's existing SwallowingHookInvoker disposition) within
 * roughly the configured window instead of hanging execute() forever. Left
 * unset, behavior is completely unchanged from before this field existed.
 */

import {
  ok, rejects, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { RetryConfigInterface } from '../../../src/interfaces/index.js';
import type { RetryCallStateType } from '../../../src/types/RetryCallStateType.js';

import { Retry } from '../../../src/retry/index.js';
import { NonRetryableError } from '../../../src/errors/index.js';

const HOOK_TIMEOUT_MS = 30;
const GENEROUS_UPPER_BOUND_MS = 1000;

// ---------------------------------------------------------------------------
// (a) A hook that resolves before hookTimeoutMs behaves identically to today.
// ---------------------------------------------------------------------------

it('a hook that resolves before hookTimeoutMs behaves identically to no timeout at all', async () => {
  class FastHookRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override async onAttempt(): Promise<void> {
      await new Promise<void>((resolve) => { setTimeout(resolve, 1); });
    }
  }

  const retry = new FastHookRetry({ 'hookTimeoutMs': HOOK_TIMEOUT_MS, 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});

// ---------------------------------------------------------------------------
// (b) A hook that never settles, with hookTimeoutMs configured, is swallowed
// within roughly the configured window rather than hanging the retried
// operation forever.
// ---------------------------------------------------------------------------

it('a hung onAttempt hook with hookTimeoutMs configured is swallowed and does not hang execute()', async () => {
  class HangingAttemptRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onAttempt(): Promise<void> {
      // Never resolves, never rejects.
      return new Promise<void>(() => {});
    }
  }

  const retry = new HangingAttemptRetry({ 'hookTimeoutMs': HOOK_TIMEOUT_MS, 'maxRetries': 1 });

  const startedAt = Date.now();
  const result = await retry.execute(async () => 'ok despite hung hook');
  const elapsedMs = Date.now() - startedAt;

  strictEqual(result, 'ok despite hung hook');
  ok(
    elapsedMs < GENEROUS_UPPER_BOUND_MS,
    `expected execute() to return well within ${GENEROUS_UPPER_BOUND_MS}ms of the configured ${HOOK_TIMEOUT_MS}ms hook timeout, took ${elapsedMs}ms`
  );
});

it('a hung onGiveUp hook with hookTimeoutMs configured is swallowed and does not hang the non-retryable failure path', async () => {
  class HangingGiveUpRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onGiveUp(): Promise<void> {
      return new Promise<void>(() => {});
    }
  }

  const retry = new HangingGiveUpRetry({
    'errorClassifier': () => ({ 'reason': 'fatal', 'retryable': false }),
    'hookTimeoutMs': HOOK_TIMEOUT_MS,
    'maxRetries': 1
  });

  const startedAt = Date.now();
  await rejects(
    () => retry.execute(async () => { throw new Error('fatal'); }),
    NonRetryableError
  );
  const elapsedMs = Date.now() - startedAt;

  ok(
    elapsedMs < GENEROUS_UPPER_BOUND_MS,
    `expected execute() to reject well within ${GENEROUS_UPPER_BOUND_MS}ms of the configured ${HOOK_TIMEOUT_MS}ms hook timeout, took ${elapsedMs}ms`
  );
});

// ---------------------------------------------------------------------------
// (c) With hookTimeoutMs unset, existing behavior is completely unchanged —
// including RetryCallFsm's separate, untouched enterCall swallow-catch.
// ---------------------------------------------------------------------------

it('a hung onAttempt hook with hookTimeoutMs unset hangs execute() forever (unchanged prior behavior)', async () => {
  class HangingAttemptRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override onAttempt(): Promise<void> {
      return new Promise<void>(() => {});
    }
  }

  const retry = new HangingAttemptRetry({ 'maxRetries': 1 });

  const raceResult = await Promise.race([
    retry.execute(async () => 'ok'),
    new Promise<'timed-out'>((resolve) => { setTimeout(() => { resolve('timed-out'); }, 100); })
  ]);

  strictEqual(raceResult, 'timed-out', 'without hookTimeoutMs, a hung hook must still block execute() indefinitely');
});

it('a throwing enterCall hook is still swallowed via RetryCallFsm when hookTimeoutMs is unset', async () => {
  class ThrowingEnterCallRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    protected override enterCall(_to: RetryCallStateType, _from: RetryCallStateType): void {
      throw new Error('enterCall boom');
    }
  }

  const retry = new ThrowingEnterCallRetry({ 'maxRetries': 1 });
  const result = await retry.execute(async () => 'ok');

  strictEqual(result, 'ok');
});
