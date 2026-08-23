import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';
import { ThrottleAbortedError, ThrottleDrainingError } from '../../../src/errors/index.js';
import { Throttle } from '../../../src/throttle/index.js';

type AbortResult = { cancelled: number; completed: number; timedOut: boolean };
type ExpectedAbortResult = Partial<AbortResult>;

type ScenarioShape =
  | 'abort-after-abort-is-idempotent'
  | 'abort-cancels-active-and-queued'
  | 'abort-during-draining-cancels-active-and-queued'
  | 'abort-immediate-with-active-work'
  | 'abort-on-complete-skips-grace-period'
  | 'abort-start-hook-throws'
  | 'abort-timeout-completes'
  | 'abort-timeout-timed-out'
  | 'abort-zero-timeout-with-active-work'
  | 'drain-on-complete-returns-immediately'
  | 'drain-reuses-completion-promise'
  | 'drain-waits-for-active-and-queued'
  | 'execute-after-abort-throws'
  | 'execute-during-draining-throws'
  | 'on-acquire-throws'
  | 'on-acquire-wait-throws'
  | 'on-contended-throws'
  | 'on-reject-throws'
  | 'on-release-throws'
  | 'on-window-slide-throws'
  | 'on-release-fires-exactly-once-became-idle'
  | 'on-release-fires-exactly-once-handoff-granted'
  | 'on-release-fires-exactly-once-on-acquire-rollback'
  | 'on-release-fires-exactly-once-on-rejection'
  | 'on-release-fires-exactly-once-still-busy'
  | 'queued-operation-completes-after-release';

type ThrottleConfigInput = NonNullable<Parameters<typeof Throttle.create>[0]>;

type ScenarioCase = {
  description: string;
  expected: {
    abort?: ExpectedAbortResult;
    activeCount?: number;
    activeResolvedWithUndefined?: boolean;
    activeResult?: string;
    causeMessage?: string;
    drainResolvedBeforeRelease?: boolean;
    errorName?: string;
    isComplete?: boolean;
    order?: readonly string[];
    queuedCount?: number;
    releaseCount?: number;
    queuedResolvedWithUndefined?: boolean;
    queuedStarted?: boolean;
    result?: string;
    results?: readonly number[];
    secondAbort?: ExpectedAbortResult;
    totalExecuted?: number;
  };
  input: {
    abortOptions?: { timeout: number };
    activeResult?: number | string;
    hookErrorMessage?: string;
    operationErrorMessage?: string;
    queuedResult?: number | string;
    settleMs?: number;
    throttle: ThrottleConfigInput;
  };
  shape: ScenarioShape;
  name: string;
};

import scenarioGroups from './lifecycle.scenarios.json' with { type: 'json' };

class TrackingThrottle extends Throttle {}

type BlockedPairInput = {
  activeResult: string;
  queuedResult: string;
};

async function settleLoop(ms: number): Promise<void> {
  await new Promise<void>((resolve) => { setTimeout(resolve, ms); });
}

function createBlockedPair(
  throttle: TrackingThrottle,
  input: BlockedPairInput
): {
  active: Promise<string | undefined>;
  queued: Promise<string | undefined>;
  queuedStarted: () => boolean;
  releaseActive: () => void;
} {
  let queuedStarted = false;
  let releaseActive = (): void => { throw new Error('active operation was not started'); };
  const blocker = new Promise<void>((resolve) => { releaseActive = resolve; });
  const active = throttle.execute(async () => {
    await blocker;
    return input.activeResult;
  });
  const queued = throttle.execute(async () => {
    queuedStarted = true;
    return input.queuedResult;
  });

  return {
    active,
    queued,
    queuedStarted: () => queuedStarted,
    releaseActive
  };
}

function assertHookInvocation(error: HookInvocationError, expected: ScenarioCase['expected']): boolean {
  assert.strictEqual(error.name, expected.errorName);
  assert.ok(error.cause instanceof Error);
  assert.strictEqual(error.cause.message, expected.causeMessage);
  return true;
}

function requireAbortResult(value: ExpectedAbortResult | undefined, label: string): ExpectedAbortResult {
  if (value === undefined) {
    throw new Error(`Missing expected ${label}`);
  }
  return value;
}

function assertAbortResult(actual: AbortResult, expected: ExpectedAbortResult): void {
  if (expected.cancelled !== undefined) {
    assert.strictEqual(actual.cancelled, expected.cancelled);
  }
  if (expected.completed !== undefined) {
    assert.strictEqual(actual.completed, expected.completed);
  }
  if (expected.timedOut !== undefined) {
    assert.strictEqual(actual.timedOut, expected.timedOut);
  }
}

function requireBoolean(value: boolean | undefined, label: string): boolean {
  if (value === undefined) {
    throw new Error(`Missing expected ${label}`);
  }
  return value;
}

function requireNumber(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`Missing expected ${label}`);
  }
  return value;
}

function requireNumberInput(value: number | string | undefined, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`Missing numeric input ${label}`);
  }
  return value;
}

function requireString(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw new Error(`Missing expected ${label}`);
  }
  return value;
}

function requireStringInput(value: number | string | undefined, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Missing string input ${label}`);
  }
  return value;
}

function blockedPairInput(input: ScenarioCase['input']): BlockedPairInput {
  return {
    activeResult: requireStringInput(input.activeResult, 'activeResult'),
    queuedResult: requireStringInput(input.queuedResult, 'queuedResult')
  };
}

function settleMs(input: ScenarioCase['input']): number {
  return input.settleMs ?? 0;
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => Promise<void>> = {
  'abort-timeout-timed-out': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const active = throttle.execute(async () => {
      await blocker;
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await Promise.resolve();
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    release();
    await active;
  },

  'abort-timeout-completes': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const active = throttle.execute(async () => {
      await blocker;
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await Promise.resolve();
    const abortPromise = throttle.abort(scenarioCase.input.abortOptions);
    release();
    const result = await abortPromise;
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    await active;
  },

  'abort-immediate-with-active-work': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const active = throttle.execute(async () => {
      await blocker;
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await Promise.resolve();
    const result = await throttle.abort();
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    release();
    await active;
  },

  'abort-zero-timeout-with-active-work': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const active = throttle.execute(async () => {
      await blocker;
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await Promise.resolve();
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    release();
    await active;
  },

  'abort-start-hook-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingThrottle extends TrackingThrottle {
      protected override onAbortStart(): void {
        throw original;
      }
    }

    const throttle = ThrowingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const active = throttle.execute(async () => {
      await blocker;
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await Promise.resolve();

    await assert.rejects(throttle.abort(), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });

    release();
    await active;
  },

  'abort-after-abort-is-idempotent': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const first = await throttle.abort();
    const second = await throttle.abort();
    assertAbortResult(first, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    assertAbortResult(second, requireAbortResult(scenarioCase.expected.secondAbort, 'secondAbort'));
  },

  'abort-on-complete-skips-grace-period': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
  },

  'abort-cancels-active-and-queued': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const pair = createBlockedPair(throttle, blockedPairInput(scenarioCase.input));
    await settleLoop(settleMs(scenarioCase.input));

    const result = await throttle.abort(scenarioCase.input.abortOptions);
    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    assert.strictEqual(await pair.active, undefined);
    assert.strictEqual(await pair.queued, undefined);
    assert.strictEqual(pair.queuedStarted(), requireBoolean(scenarioCase.expected.queuedStarted, 'queuedStarted'));

    pair.releaseActive();
    await settleLoop(settleMs(scenarioCase.input));

    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
    assert.strictEqual(throttle.getStats().totalExecuted, requireNumber(scenarioCase.expected.totalExecuted, 'totalExecuted'));
    assert.strictEqual(requireBoolean(scenarioCase.expected.activeResolvedWithUndefined, 'activeResolvedWithUndefined'), true);
    assert.strictEqual(requireBoolean(scenarioCase.expected.queuedResolvedWithUndefined, 'queuedResolvedWithUndefined'), true);
  },

  'abort-during-draining-cancels-active-and-queued': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const pair = createBlockedPair(throttle, blockedPairInput(scenarioCase.input));
    await settleLoop(settleMs(scenarioCase.input));

    const drainPromise = throttle.drain();
    await settleLoop(settleMs(scenarioCase.input));
    const result = await throttle.abort(scenarioCase.input.abortOptions);

    assertAbortResult(result, requireAbortResult(scenarioCase.expected.abort, 'abort'));
    await drainPromise;
    assert.strictEqual(await pair.active, undefined);
    assert.strictEqual(await pair.queued, undefined);
    assert.strictEqual(pair.queuedStarted(), requireBoolean(scenarioCase.expected.queuedStarted, 'queuedStarted'));

    pair.releaseActive();
    await settleLoop(settleMs(scenarioCase.input));

    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
    assert.strictEqual(throttle.getStats().totalExecuted, requireNumber(scenarioCase.expected.totalExecuted, 'totalExecuted'));
    assert.strictEqual(requireBoolean(scenarioCase.expected.activeResolvedWithUndefined, 'activeResolvedWithUndefined'), true);
    assert.strictEqual(requireBoolean(scenarioCase.expected.queuedResolvedWithUndefined, 'queuedResolvedWithUndefined'), true);
  },

  'on-acquire-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingAcquireThrottle extends TrackingThrottle {
      protected override onAcquire(): void {
        throw original;
      }
    }

    const throttle = ThrowingAcquireThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult')), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    assert.strictEqual(throttle.getStats().activeCount, requireNumber(scenarioCase.expected.activeCount, 'activeCount'));
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'on-release-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingReleaseThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        throw original;
      }
    }

    const throttle = ThrowingReleaseThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult')), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'on-contended-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingContendedThrottle extends TrackingThrottle {
      protected override onContended(): void {
        throw original;
      }
    }

    const throttle = ThrowingContendedThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const active = throttle.execute(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await settleLoop(settleMs(scenarioCase.input));

    await assert.rejects(throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult')), (error) => {
      return error instanceof HookInvocationError && assertHookInvocation(error, scenarioCase.expected);
    });

    assert.strictEqual(throttle.getStats().activeCount, requireNumber(scenarioCase.expected.activeCount, 'activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, requireNumber(scenarioCase.expected.queuedCount, 'queuedCount'));
    release();
    assert.strictEqual(await active, requireString(scenarioCase.expected.activeResult, 'activeResult'));
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'on-acquire-wait-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingAcquireWaitThrottle extends TrackingThrottle {
      protected override onAcquireWait(): void {
        throw original;
      }
    }

    const throttle = ThrowingAcquireWaitThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const active = throttle.execute(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await settleLoop(settleMs(scenarioCase.input));

    const queued = throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));
    await assert.rejects(queued, (error) => {
      return error instanceof HookInvocationError && assertHookInvocation(error, scenarioCase.expected);
    });

    assert.strictEqual(throttle.getStats().activeCount, requireNumber(scenarioCase.expected.activeCount, 'activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, requireNumber(scenarioCase.expected.queuedCount, 'queuedCount'));
    release();
    assert.strictEqual(await active, requireString(scenarioCase.expected.activeResult, 'activeResult'));
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'on-reject-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingRejectThrottle extends TrackingThrottle {
      protected override onReject(): void {
        throw original;
      }
    }

    const throttle = ThrowingRejectThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(async () => {
      throw new Error(requireStringInput(scenarioCase.input.operationErrorMessage, 'operationErrorMessage'));
    }), (error) => {
      return error instanceof HookInvocationError && assertHookInvocation(error, scenarioCase.expected);
    });

    assert.strictEqual(throttle.getStats().activeCount, requireNumber(scenarioCase.expected.activeCount, 'activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, requireNumber(scenarioCase.expected.queuedCount, 'queuedCount'));
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'drain-waits-for-active-and-queued': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const first = throttle.execute(async () => {
      await blocker;
      return requireNumberInput(scenarioCase.input.activeResult, 'activeResult');
    });
    const second = throttle.execute(async () => requireNumberInput(scenarioCase.input.queuedResult, 'queuedResult'));
    await Promise.resolve();
    const drainPromise = throttle.drain();
    release();
    await drainPromise;
    assert.deepStrictEqual([await first, await second], scenarioCase.expected.results);
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'drain-reuses-completion-promise': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    let release!: () => void;
    const active = throttle.execute(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return requireStringInput(scenarioCase.input.activeResult, 'activeResult');
    });
    await settleLoop(settleMs(scenarioCase.input));

    let firstDrainResolved = false;
    let secondDrainResolved = false;
    const firstDrain = throttle.drain().then(() => { firstDrainResolved = true; });
    const secondDrain = throttle.drain().then(() => { secondDrainResolved = true; });
    await settleLoop(settleMs(scenarioCase.input));

    assert.strictEqual(firstDrainResolved, requireBoolean(scenarioCase.expected.drainResolvedBeforeRelease, 'drainResolvedBeforeRelease'));
    assert.strictEqual(secondDrainResolved, requireBoolean(scenarioCase.expected.drainResolvedBeforeRelease, 'drainResolvedBeforeRelease'));
    release();
    assert.strictEqual(await active, requireString(scenarioCase.expected.result, 'result'));
    await Promise.all([firstDrain, secondDrain]);
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'drain-on-complete-returns-immediately': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    await throttle.drain();
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
    await throttle.drain();
    assert.strictEqual(throttle.isComplete(), requireBoolean(scenarioCase.expected.isComplete, 'isComplete'));
  },

  'queued-operation-completes-after-release': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const order: string[] = [];
    let releaseFirst!: () => void;
    const first = throttle.execute(async () => {
      order.push('first-start');
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      order.push('first-end');
      return requireNumberInput(scenarioCase.input.activeResult, 'activeResult');
    });
    const second = throttle.execute(async () => {
      order.push('second-start');
      return requireNumberInput(scenarioCase.input.queuedResult, 'queuedResult');
    });
    await settleLoop(settleMs(scenarioCase.input));
    assert.ok(releaseFirst !== undefined);
    releaseFirst();
    await Promise.all([first, second]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  },

  'on-window-slide-throws': async (scenarioCase) => {
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingWindowSlideThrottle extends TrackingThrottle {
      protected override onWindowSlide(): void {
        throw original;
      }
    }

    const throttle = ThrowingWindowSlideThrottle.create(scenarioCase.input.throttle);
    let releaseFirst!: () => void;
    const first = throttle.execute(async () => {
      await new Promise<void>((resolve) => { releaseFirst = resolve; });
      return requireNumberInput(scenarioCase.input.activeResult, 'activeResult');
    });
    const second = throttle.execute(async () => requireNumberInput(scenarioCase.input.queuedResult, 'queuedResult'));
    await settleLoop(settleMs(scenarioCase.input));
    assert.ok(releaseFirst !== undefined);
    releaseFirst();
    await assert.rejects(second, (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    await first;
  },

  'execute-after-abort-throws': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    await throttle.abort();
    await assert.rejects(async () => {
      await throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));
    }, ThrottleAbortedError);
  },

  'execute-during-draining-throws': async (scenarioCase) => {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const draining = throttle.drain();
    await assert.rejects(async () => {
      await throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));
    }, ThrottleDrainingError);
    await draining;
  },

  // The following four scenarios are the fix's core regression coverage: onRelease must
  // fire EXACTLY once per completed operation, across every outcome branch (still busy,
  // became idle, handoff granted) and every call site that leads to a release (success,
  // rejection, acquire-hook-failure rollback). A count of anything other than 1 per
  // release, or a total mismatched with the number of completed operations, means the
  // OperationLifecycleMachine's single-effect-per-event guarantee has been violated.

  'on-release-fires-exactly-once-still-busy': async (scenarioCase) => {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    // concurrencyLimit: 2 — both operations acquire immediately, no queue, so each
    // release lands in the "still busy" branch (the other operation stays active) except
    // the very last one, which becomes idle. Both must still each fire onRelease once.
    const first = throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));
    const second = throttle.execute(async () => requireStringInput(scenarioCase.input.queuedResult, 'queuedResult'));
    await Promise.all([first, second]);

    assert.strictEqual(releaseCounts.length, requireNumber(scenarioCase.expected.releaseCount, 'releaseCount'));
  },

  'on-release-fires-exactly-once-became-idle': async (scenarioCase) => {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    await throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));

    assert.strictEqual(releaseCounts.length, requireNumber(scenarioCase.expected.releaseCount, 'releaseCount'));
    assert.strictEqual(throttle.isComplete(), true);
  },

  'on-release-fires-exactly-once-handoff-granted': async (scenarioCase) => {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    // concurrencyLimit: 1 — the leader occupies the only slot, the waiter queues behind
    // it. The leader's release hands the slot off to the waiter (handoff-granted), then
    // the waiter's own release becomes-idle. Both releases must fire onRelease once each.
    const leader = throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult'));
    const waiter = throttle.execute(async () => requireStringInput(scenarioCase.input.queuedResult, 'queuedResult'));
    await Promise.all([leader, waiter]);

    assert.strictEqual(releaseCounts.length, requireNumber(scenarioCase.expected.releaseCount, 'releaseCount'));
  },

  'on-release-fires-exactly-once-on-rejection': async (scenarioCase) => {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(async () => {
      throw new Error(requireStringInput(scenarioCase.input.operationErrorMessage, 'operationErrorMessage'));
    }));

    assert.strictEqual(releaseCounts.length, requireNumber(scenarioCase.expected.releaseCount, 'releaseCount'));
  },

  'on-release-fires-exactly-once-on-acquire-rollback': async (scenarioCase) => {
    const releaseCounts: number[] = [];
    const original = new Error(requireStringInput(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class CountingRollbackThrottle extends TrackingThrottle {
      protected override onAcquire(): void {
        throw original;
      }

      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingRollbackThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(async () => requireStringInput(scenarioCase.input.activeResult, 'activeResult')), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });

    assert.strictEqual(releaseCounts.length, requireNumber(scenarioCase.expected.releaseCount, 'releaseCount'));
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle lifecycle', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
