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
import { it } from 'node:test';

import type { RetryCallStateType } from '../../../src/types/RetryCallStateType.js';

import type { RetryConfigInterface, RetryContextType } from '../../../src/interfaces/index.js';

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
  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

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

/**
 * TrackingRetry subclass that signals abort via the onRetryScheduled lifecycle hook.
 */
class AbortingTrackingRetry extends TrackingRetry {
  protected override onRetryScheduled(context: RetryContextType): void {
    context.abort = true;
    context.delayMs = 0;
  }
}

// ---------------------------------------------------------------------------
// Transition scenario runner
// ---------------------------------------------------------------------------

type TransitionScenario = {
  description: string;
  build: () => TrackingRetry;
  execute: (retry: TrackingRetry) => Promise<unknown>;
  expectedTransitions: TransitionRecord[];
  expectReject?: boolean;
};

const transitionScenarios: TransitionScenario[] = [
  {
    description: 'attempting → succeeded on immediate success',
    build: () => new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maxRetries: 3
    }),
    execute: (retry) => retry.execute(async () => 'ok'),
    expectedTransitions: [
      { from: 'attempting', to: 'succeeded' }
    ]
  },
  {
    description: 'attempting → waiting → attempting → succeeded on one retryable failure then success',
    build: () => new TrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maxRetries: 3
    }),
    execute: (() => {
      let callCount = 0;
      return (retry: TrackingRetry) => retry.execute(async () => {
        callCount++;
        if (callCount === 1) throw new Error('transient failure');
        return 'recovered';
      });
    })(),
    expectedTransitions: [
      { from: 'attempting', to: 'waiting' },
      { from: 'waiting',    to: 'attempting' },
      { from: 'attempting', to: 'succeeded' }
    ]
  },
  {
    description: 'attempting → failed on non-retryable error',
    build: () => new TrackingRetry({
      errorClassifier: new AlwaysNonRetryableClassifier(),
      maxRetries: 3
    }),
    execute: (retry) => retry.execute(async () => { throw new Error('fatal'); }),
    expectedTransitions: [
      { from: 'attempting', to: 'failed' }
    ],
    expectReject: true
  },
  {
    description: 'waiting → aborted via lifecycle hook abort signal',
    build: () => new AbortingTrackingRetry({
      errorClassifier: DefaultHttpErrorClassifier.create(),
      maxRetries: 3
    }),
    execute: (retry) => retry.execute(async () => { throw new Error('will be aborted'); }),
    expectedTransitions: [
      { from: 'attempting', to: 'waiting' },
      { from: 'waiting',    to: 'aborted' }
    ],
    expectReject: true
  }
];

for (const { description, build, execute, expectedTransitions, expectReject } of transitionScenarios) {
  it(description, async () => {
    const retry = build();

    if (expectReject === true) {
      try {
        await execute(retry);
      } catch {
        // expected rejection
      }
    } else {
      await execute(retry);
    }

    deepStrictEqual(retry.transitions, expectedTransitions);
  });
}

// ---------------------------------------------------------------------------
// Budget exhaustion — unique shape, verify exhausted transition
// ---------------------------------------------------------------------------

it('waiting → exhausted when budget is gone (maxRetries: 1)', async () => {
  const retry = new TrackingRetry({
    errorClassifier: DefaultHttpErrorClassifier.create(),
    maxRetries: 1
  });

  await rejects(
    () => retry.execute(async () => { throw new Error('always fails'); }),
    MaxRetriesExceededError
  );

  const exhaustedTransition = retry.transitions.find(t => t.to === 'exhausted');
  deepStrictEqual(exhaustedTransition, { from: 'waiting', to: 'exhausted' });
});

// ---------------------------------------------------------------------------
// Non-retryable error type assertion
// ---------------------------------------------------------------------------

it('attempting → failed surfaces NonRetryableError', async () => {
  const retry = new TrackingRetry({
    errorClassifier: new AlwaysNonRetryableClassifier(),
    maxRetries: 3
  });

  await rejects(
    () => retry.execute(async () => { throw new Error('fatal'); }),
    NonRetryableError
  );
});

// ---------------------------------------------------------------------------
// Illegal transition — guardCall returning false
// ---------------------------------------------------------------------------

it('illegal transition throws when guardCall returns false', async () => {
  class GuardRejectingRetry extends Retry {
    constructor(config?: Partial<RetryConfigInterface>) {
      super(config ?? {});
    }

    override guardCall(from: RetryCallStateType, to: RetryCallStateType): boolean {
      if (from === 'attempting' && to === 'succeeded') return false;
      return super.guardCall(from, to);
    }
  }

  const retry = new GuardRejectingRetry({
    errorClassifier: DefaultHttpErrorClassifier.create(),
    maxRetries: 3
  });

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

// ---------------------------------------------------------------------------
// Builder integration
// ---------------------------------------------------------------------------

it('TrackingRetry is constructable via RetryBuilder', () => {
  const retry = RetryBuilder.create((opts) => {
    const result = new TrackingRetry(opts);
    return result;
  })
    .maxRetries(2)
    .errorClassifier(DefaultHttpErrorClassifier.create())
    .build();

  strictEqual(retry instanceof TrackingRetry, true);
  strictEqual(retry instanceof Retry, true);
});
