import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ThrottleAbortedError, ThrottleDrainingError } from '../../../src/throttle/errors/index.js';
import { Throttle } from '../../../src/throttle/throttle/index.js';
import { LifecycleScenarioCaseEntity } from './entities/LifecycleScenarioCaseEntity.js';
import { RejectingOperation } from './fixtures/RejectingOperation.js';
import { ResolvingOperation } from './fixtures/ResolvingOperation.js';
import scenarioGroups from './lifecycle.scenarios.json' with { 'type': 'json' };

class TrackingThrottle extends Throttle {}

class BlockedPair {
  readonly active: Promise<string | undefined>;

  queuedStarted = false;

  readonly queued: Promise<string | undefined>;

  readonly #blocker = Promise.withResolvers<void>();

  constructor(throttle: TrackingThrottle, activeResult: string, queuedResult: string) {
    this.active = throttle.execute(async () => {
      await this.#blocker.promise;
      return activeResult;
    });
    this.queued = throttle.execute(() => {
      this.queuedStarted = true;
      const settled = Promise.resolve(queuedResult);
      return settled;
    });
  }

  releaseActive(): void {
    this.#blocker.resolve();
  }
}

class LifecycleRunners {
  static async 'abort-after-abort-is-idempotent'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-after-abort-is-idempotent'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const first = await throttle.abort();
    const second = await throttle.abort();
    LifecycleRunners.assertAbortResult(first, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    LifecycleRunners.assertAbortResult(second, ScenarioValues.requireDefined(scenarioCase.expected.secondAbort, 'expected.secondAbort'));
  }

  static async 'abort-cancels-active-and-queued'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-cancels-active-and-queued'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const pair = new BlockedPair(throttle, ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'), ScenarioValues.requireString(scenarioCase.input.queuedResult, 'queuedResult'));
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    const result = await throttle.abort();
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    assert.strictEqual(await pair.active, undefined);
    assert.strictEqual(await pair.queued, undefined);
    assert.strictEqual(pair.queuedStarted, ScenarioValues.requireDefined(scenarioCase.expected.queuedStarted, 'expected.queuedStarted'));

    pair.releaseActive();
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
    assert.strictEqual(throttle.getStats().totalExecuted, ScenarioValues.requireDefined(scenarioCase.expected.totalExecuted, 'expected.totalExecuted'));
    assert.strictEqual(ScenarioValues.requireDefined(scenarioCase.expected.activeResolvedWithUndefined, 'expected.activeResolvedWithUndefined'), true);
    assert.strictEqual(ScenarioValues.requireDefined(scenarioCase.expected.queuedResolvedWithUndefined, 'expected.queuedResolvedWithUndefined'), true);
  }

  static async 'abort-during-draining-cancels-active-and-queued'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-during-draining-cancels-active-and-queued'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const pair = new BlockedPair(throttle, ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'), ScenarioValues.requireString(scenarioCase.input.queuedResult, 'queuedResult'));
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    const drainPromise = throttle.drain();
    await setTimeout(scenarioCase.input.settleMs ?? 0);
    const result = await throttle.abort(scenarioCase.input.abortOptions);

    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    await drainPromise;
    assert.strictEqual(await pair.active, undefined);
    assert.strictEqual(await pair.queued, undefined);
    assert.strictEqual(pair.queuedStarted, ScenarioValues.requireDefined(scenarioCase.expected.queuedStarted, 'expected.queuedStarted'));

    pair.releaseActive();
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
    assert.strictEqual(throttle.getStats().totalExecuted, ScenarioValues.requireDefined(scenarioCase.expected.totalExecuted, 'expected.totalExecuted'));
    assert.strictEqual(ScenarioValues.requireDefined(scenarioCase.expected.activeResolvedWithUndefined, 'expected.activeResolvedWithUndefined'), true);
    assert.strictEqual(ScenarioValues.requireDefined(scenarioCase.expected.queuedResolvedWithUndefined, 'expected.queuedResolvedWithUndefined'), true);
  }

  static async 'abort-immediate-with-active-work'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-immediate-with-active-work'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await Promise.resolve();
    const result = await throttle.abort();
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    blocker.resolve();
    await active;
  }

  static async 'abort-on-complete-skips-grace-period'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-on-complete-skips-grace-period'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
  }

  static async 'abort-start-hook-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-start-hook-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingThrottle extends TrackingThrottle {
      protected override onAbortStart(): void {
        throw original;
      }
    }

    const throttle = ThrowingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await Promise.resolve();

    await assert.rejects(throttle.abort(), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });

    blocker.resolve();
    await active;
  }

  static async 'abort-timeout-completes'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-timeout-completes'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await Promise.resolve();
    const abortPromise = throttle.abort(scenarioCase.input.abortOptions);
    blocker.resolve();
    const result = await abortPromise;
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    await active;
  }

  static async 'abort-timeout-timed-out'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-timeout-timed-out'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await Promise.resolve();
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    blocker.resolve();
    await active;
  }

  static async 'abort-zero-timeout-with-active-work'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'abort-zero-timeout-with-active-work'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await Promise.resolve();
    const result = await throttle.abort(scenarioCase.input.abortOptions);
    LifecycleRunners.assertAbortResult(result, ScenarioValues.requireDefined(scenarioCase.expected.abort, 'expected.abort'));
    blocker.resolve();
    await active;
  }

  static async 'drain-on-complete-returns-immediately'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'drain-on-complete-returns-immediately'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    await throttle.drain();
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
    await throttle.drain();
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'drain-reuses-completion-promise'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'drain-reuses-completion-promise'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    let firstDrainResolved = false;
    let secondDrainResolved = false;
    const firstDrain = throttle.drain().then(() => { firstDrainResolved = true; });
    const secondDrain = throttle.drain().then(() => { secondDrainResolved = true; });
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    assert.strictEqual(firstDrainResolved, ScenarioValues.requireDefined(scenarioCase.expected.drainResolvedBeforeRelease, 'expected.drainResolvedBeforeRelease'));
    assert.strictEqual(secondDrainResolved, ScenarioValues.requireDefined(scenarioCase.expected.drainResolvedBeforeRelease, 'expected.drainResolvedBeforeRelease'));
    blocker.resolve();
    assert.strictEqual(await active, ScenarioValues.requireDefined(scenarioCase.expected.result, 'expected.result'));
    await Promise.all([firstDrain, secondDrain]);
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'drain-waits-for-active-and-queued'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'drain-waits-for-active-and-queued'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const first = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireNumber(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    const second = throttle.execute(ResolvingOperation.of(ScenarioValues.requireNumber(scenarioCase.input.queuedResult, 'queuedResult')));
    await Promise.resolve();
    const drainPromise = throttle.drain();
    blocker.resolve();
    await drainPromise;
    assert.deepStrictEqual([await first, await second], scenarioCase.expected.results);
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'execute-after-abort-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'execute-after-abort-throws'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    await throttle.abort();
    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), ThrottleAbortedError);
  }

  static async 'execute-during-draining-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'execute-during-draining-throws'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const draining = throttle.drain();
    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), ThrottleDrainingError);
    await draining;
  }

  static async 'on-acquire-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-acquire-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingAcquireThrottle extends TrackingThrottle {
      protected override onAcquire(): void {
        throw original;
      }
    }

    const throttle = ThrowingAcquireThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    assert.strictEqual(throttle.getStats().activeCount, ScenarioValues.requireDefined(scenarioCase.expected.activeCount, 'expected.activeCount'));
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'on-acquire-wait-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-acquire-wait-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingAcquireWaitThrottle extends TrackingThrottle {
      protected override onAcquireWait(): void {
        throw original;
      }
    }

    const throttle = ThrowingAcquireWaitThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    const queued = throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult')));
    await assert.rejects(queued, (error) => {
      const caught: unknown = error;
      const matches = caught instanceof HookInvocationError && LifecycleRunners.matchesHookInvocation(caught, scenarioCase.expected);
      return matches;
    });

    assert.strictEqual(throttle.getStats().activeCount, ScenarioValues.requireDefined(scenarioCase.expected.activeCount, 'expected.activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, ScenarioValues.requireDefined(scenarioCase.expected.queuedCount, 'expected.queuedCount'));
    blocker.resolve();
    assert.strictEqual(await active, ScenarioValues.requireDefined(scenarioCase.expected.activeResult, 'expected.activeResult'));
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'on-contended-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-contended-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingContendedThrottle extends TrackingThrottle {
      protected override onContended(): void {
        throw original;
      }
    }

    const throttle = ThrowingContendedThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const active = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    await setTimeout(scenarioCase.input.settleMs ?? 0);

    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), (error) => {
      const caught: unknown = error;
      const matches = caught instanceof HookInvocationError && LifecycleRunners.matchesHookInvocation(caught, scenarioCase.expected);
      return matches;
    });

    assert.strictEqual(throttle.getStats().activeCount, ScenarioValues.requireDefined(scenarioCase.expected.activeCount, 'expected.activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, ScenarioValues.requireDefined(scenarioCase.expected.queuedCount, 'expected.queuedCount'));
    blocker.resolve();
    assert.strictEqual(await active, ScenarioValues.requireDefined(scenarioCase.expected.activeResult, 'expected.activeResult'));
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'on-reject-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-reject-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingRejectThrottle extends TrackingThrottle {
      protected override onReject(): void {
        throw original;
      }
    }

    const throttle = ThrowingRejectThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(RejectingOperation.of(ScenarioValues.requireString(scenarioCase.input.operationErrorMessage, 'operationErrorMessage'))), (error) => {
      const caught: unknown = error;
      const matches = caught instanceof HookInvocationError && LifecycleRunners.matchesHookInvocation(caught, scenarioCase.expected);
      return matches;
    });

    assert.strictEqual(throttle.getStats().activeCount, ScenarioValues.requireDefined(scenarioCase.expected.activeCount, 'expected.activeCount'));
    assert.strictEqual(throttle.getStats().queuedCount, ScenarioValues.requireDefined(scenarioCase.expected.queuedCount, 'expected.queuedCount'));
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'on-release-fires-exactly-once-became-idle'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-fires-exactly-once-became-idle'>): Promise<void> {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    await throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult')));

    assert.strictEqual(releaseCounts.length, ScenarioValues.requireDefined(scenarioCase.expected.releaseCount, 'expected.releaseCount'));
    assert.strictEqual(throttle.isComplete(), true);
  }

  static async 'on-release-fires-exactly-once-handoff-granted'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-fires-exactly-once-handoff-granted'>): Promise<void> {
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
    const leader = throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult')));
    const waiter = throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.queuedResult, 'queuedResult')));
    await Promise.all([leader, waiter]);

    assert.strictEqual(releaseCounts.length, ScenarioValues.requireDefined(scenarioCase.expected.releaseCount, 'expected.releaseCount'));
  }

  static async 'on-release-fires-exactly-once-on-acquire-rollback'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-fires-exactly-once-on-acquire-rollback'>): Promise<void> {
    const releaseCounts: number[] = [];
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class CountingRollbackThrottle extends TrackingThrottle {
      protected override onAcquire(): void {
        throw original;
      }

      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingRollbackThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });

    assert.strictEqual(releaseCounts.length, ScenarioValues.requireDefined(scenarioCase.expected.releaseCount, 'expected.releaseCount'));
  }

  static async 'on-release-fires-exactly-once-on-rejection'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-fires-exactly-once-on-rejection'>): Promise<void> {
    const releaseCounts: number[] = [];

    class CountingThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        releaseCounts.push(1);
      }
    }

    const throttle = CountingThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(RejectingOperation.of(ScenarioValues.requireString(scenarioCase.input.operationErrorMessage, 'operationErrorMessage'))));

    assert.strictEqual(releaseCounts.length, ScenarioValues.requireDefined(scenarioCase.expected.releaseCount, 'expected.releaseCount'));
  }

  static async 'on-release-fires-exactly-once-still-busy'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-fires-exactly-once-still-busy'>): Promise<void> {
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
    const first = throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult')));
    const second = throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.queuedResult, 'queuedResult')));
    await Promise.all([first, second]);

    assert.strictEqual(releaseCounts.length, ScenarioValues.requireDefined(scenarioCase.expected.releaseCount, 'expected.releaseCount'));
  }

  static async 'on-release-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-release-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingReleaseThrottle extends TrackingThrottle {
      protected override onRelease(): void {
        throw original;
      }
    }

    const throttle = ThrowingReleaseThrottle.create(scenarioCase.input.throttle);
    await assert.rejects(throttle.execute(ResolvingOperation.of(ScenarioValues.requireString(scenarioCase.input.activeResult, 'activeResult'))), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    assert.strictEqual(throttle.isComplete(), ScenarioValues.requireDefined(scenarioCase.expected.isComplete, 'expected.isComplete'));
  }

  static async 'on-window-slide-throws'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'on-window-slide-throws'>): Promise<void> {
    const original = RuntimeError.create(ScenarioValues.requireString(scenarioCase.input.hookErrorMessage, 'hookErrorMessage'));

    class ThrowingWindowSlideThrottle extends TrackingThrottle {
      protected override onWindowSlide(): void {
        throw original;
      }
    }

    const throttle = ThrowingWindowSlideThrottle.create(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const first = throttle.execute(async () => {
      await blocker.promise;
      const resolvedValue = ScenarioValues.requireNumber(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    const second = throttle.execute(ResolvingOperation.of(ScenarioValues.requireNumber(scenarioCase.input.queuedResult, 'queuedResult')));
    await setTimeout(scenarioCase.input.settleMs ?? 0);
    blocker.resolve();
    await assert.rejects(second, (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
    await first;
  }

  static async 'queued-operation-completes-after-release'(scenarioCase: ScenarioCaseOfType<LifecycleScenarioCaseEntity.Type, 'queued-operation-completes-after-release'>): Promise<void> {
    const throttle = TrackingThrottle.create(scenarioCase.input.throttle);
    const order: string[] = [];
    const blocker = Promise.withResolvers<void>();
    const first = throttle.execute(async () => {
      order.push('first-start');
      await blocker.promise;
      order.push('first-end');
      const resolvedValue = ScenarioValues.requireNumber(scenarioCase.input.activeResult, 'activeResult');
      return resolvedValue;
    });
    const second = throttle.execute(() => {
      order.push('second-start');
      const settled = Promise.resolve(ScenarioValues.requireNumber(scenarioCase.input.queuedResult, 'queuedResult'));
      return settled;
    });
    await setTimeout(scenarioCase.input.settleMs ?? 0);
    blocker.resolve();
    await Promise.all([first, second]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  }

  private static assertAbortResult(
    actual: { readonly 'cancelled': number; readonly 'completed': number; readonly 'timedOut': boolean },
    expected: { readonly 'cancelled'?: number; readonly 'completed'?: number; readonly 'timedOut'?: boolean }
  ): void {
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

  private static matchesHookInvocation(error: HookInvocationError, expected: { readonly 'causeMessage'?: string; readonly 'errorName'?: string }): boolean {
    assert.strictEqual(error.name, expected.errorName);
    assert.ok(error.cause instanceof Error);
    assert.strictEqual(error.cause.message, expected.causeMessage);
    const matches = true;
    return matches;
  }
}

ScenarioSuite.register({
  'entity': LifecycleScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle lifecycle',
  'runners': LifecycleRunners
});
