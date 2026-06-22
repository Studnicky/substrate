/**
 * Per-call FSM unit tests for Retry.
 *
 * Each test creates a TrackingRetry subclass that records FSM transitions via
 * the protected enterCall() hook. Tests assert that the exact sequence of
 * transitions fires for each execution path.
 */

import {
  deepStrictEqual,
  rejects,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import type { RetryCallStateType } from '../../../src/types/RetryCallStateType.js';

import {
  DefaultHttpErrorClassifier,
  Retry,
  RetryBuilder
} from '../../../src/retry/index.js';
import {
  MaxRetriesExceededError,
  NonRetryableError
} from '../../../src/errors/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TransitionRecord = { from: RetryCallStateType; to: RetryCallStateType };

/**
 * Subclass that records every per-call FSM transition via enterCall().
 * Uses DefaultHttpErrorClassifier by default.
 */
class TrackingRetry extends Retry {
  readonly transitions: TransitionRecord[] = [];

  override enterCall(to: RetryCallStateType, from: RetryCallStateType): void {
    this.transitions.push({ from, to });
  }
}

/**
 * A classifier that unconditionally returns non-retryable.
 */
class AlwaysNonRetryableClassifier {
  classify(_error: Error, _attemptNumber: number): { retryable: false; reason: string } {
    return { retryable: false, reason: 'always non-retryable' };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void describe('RetryCallFsm — per-call state machine', () => {

  void it('attempting → succeeded on immediate success', async () => {
    const retry = new TrackingRetry({
      errorClassifier: new DefaultHttpErrorClassifier(),
      maxRetries: 3
    });

    const result = await retry.execute(async () => 'ok');

    strictEqual(result, 'ok');
    deepStrictEqual(retry.transitions, [
      { from: 'attempting', to: 'succeeded' }
    ]);
  });

  void it('attempting → waiting → attempting → succeeded on one retryable failure then success', async () => {
    const retry = new TrackingRetry({
      // DefaultHttpErrorClassifier retries "unknown" errors on attempt 0
      errorClassifier: new DefaultHttpErrorClassifier(),
      maxRetries: 3,
      retryInterceptor: () => ({ delayMs: 0 })
    });

    let callCount = 0;

    const result = await retry.execute(async () => {
      callCount++;
      if (callCount === 1) throw new Error('transient failure');
      return 'recovered';
    });

    strictEqual(result, 'recovered');
    deepStrictEqual(retry.transitions, [
      { from: 'attempting', to: 'waiting' },
      { from: 'waiting',    to: 'attempting' },
      { from: 'attempting', to: 'succeeded' }
    ]);
  });

  void it('attempting → failed on non-retryable error', async () => {
    const retry = new TrackingRetry({
      errorClassifier: new AlwaysNonRetryableClassifier(),
      maxRetries: 3
    });

    await rejects(
      () => retry.execute(async () => { throw new Error('fatal'); }),
      NonRetryableError
    );

    deepStrictEqual(retry.transitions, [
      { from: 'attempting', to: 'failed' }
    ]);
  });

  void it('waiting → exhausted when budget is gone (maxRetries: 1)', async () => {
    const retry = new TrackingRetry({
      // DefaultHttpErrorClassifier retries unknown errors on attempt 0 (< EARLY_RETRY_THRESHOLD=2)
      errorClassifier: new DefaultHttpErrorClassifier(),
      maxRetries: 1,
      retryInterceptor: () => ({ delayMs: 0 })
    });

    await rejects(
      () => retry.execute(async () => { throw new Error('always fails'); }),
      MaxRetriesExceededError
    );

    // attempt 0 → retryable → waiting → (budget check: attempt 1 === maxRetries=1) → exhausted
    // The second attempt (attempt 1 === maxRetries) triggers exhausted before delay
    const exhaustedTransition = retry.transitions.find(t => t.to === 'exhausted');
    deepStrictEqual(exhaustedTransition, { from: 'waiting', to: 'exhausted' });
  });

  void it('waiting → aborted via interceptor abort signal', async () => {
    const retry = new TrackingRetry({
      errorClassifier: new DefaultHttpErrorClassifier(),
      maxRetries: 3,
      retryInterceptor: () => ({ abort: true, delayMs: 0 })
    });

    await rejects(
      () => retry.execute(async () => { throw new Error('will be aborted'); }),
      MaxRetriesExceededError
    );

    deepStrictEqual(retry.transitions, [
      { from: 'attempting', to: 'waiting' },
      { from: 'waiting',    to: 'aborted' }
    ]);
  });

  void it('illegal transition throws when guardCall returns false', async () => {
    class GuardRejectingRetry extends Retry {
      override guardCall(from: RetryCallStateType, to: RetryCallStateType): boolean {
        // Block attempting → succeeded to force the FSM to reject success
        if (from === 'attempting' && to === 'succeeded') return false;
        return super.guardCall(from, to);
      }
    }

    const retry = new GuardRejectingRetry({
      errorClassifier: new DefaultHttpErrorClassifier(),
      maxRetries: 3
    });

    // The FSM throws "Illegal state transition: attempting → succeeded" from
    // handleSuccess(). execute()'s catch block receives it, classifies it as an
    // error, and eventually surfaces it — either directly or wrapped. The
    // invariant is that the FSM error message appears somewhere in the chain.
    let caught: unknown;
    try {
      await retry.execute(async () => 'should not reach caller');
    } catch (error) {
      caught = error;
    }

    strictEqual(caught instanceof Error, true, 'should throw an Error');

    const fsmMessage = 'Illegal state transition: attempting → succeeded';
    const err = caught as Error;
    const messageOrCause =
      err.message.includes(fsmMessage)
      || (err.cause instanceof Error && err.cause.message.includes(fsmMessage));

    strictEqual(messageOrCause, true, `Expected FSM error message in thrown error chain. Got: ${err.message}`);
  });

  void it('TrackingRetry is constructable via RetryBuilder', () => {
    const retry = new RetryBuilder(TrackingRetry)
      .maxRetries(2)
      .errorClassifier(new DefaultHttpErrorClassifier())
      .build();

    strictEqual(retry instanceof TrackingRetry, true);
    strictEqual(retry instanceof Retry, true);
  });

});
