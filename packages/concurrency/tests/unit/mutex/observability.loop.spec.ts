import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { setImmediate, setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LockTimeoutError } from '../../../src/errors/index.js';
import { Mutex } from '../../../src/mutex/index.js';
import { ObservabilityScenarioCaseEntity } from './entities/ObservabilityScenarioCaseEntity.js';
import scenarioGroups from './observability.scenarios.json' with { 'type': 'json' };

class AcquireTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AcquireTrackingMutex {
    const built = new AcquireTrackingMutex(config);
    return built;
  }
  readonly acquireEvents: { 'key': string; 'waitTimeMs': number }[] = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    this.acquireEvents.push({ 'key': key, 'waitTimeMs': waitTimeMs });
  }
}

class ReleaseTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ReleaseTrackingMutex {
    const built = new ReleaseTrackingMutex(config);
    return built;
  }
  readonly releaseEvents: { 'holdTimeMs': number; 'key': string }[] = [];

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    this.releaseEvents.push({ 'holdTimeMs': holdTimeMs, 'key': key });
  }
}

class TimeoutTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): TimeoutTrackingMutex {
    const built = new TimeoutTrackingMutex(config);
    return built;
  }
  readonly timeoutEvents: { 'key': string; 'timeoutMs': number }[] = [];

  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ 'key': key, 'timeoutMs': timeoutMs });
  }
}

class ContentionTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ContentionTrackingMutex {
    const built = new ContentionTrackingMutex(config);
    return built;
  }
  readonly contentionEvents: { 'key': string; 'queueSize': number }[] = [];

  protected override onContended(key: string, queueSize: number): void {
    this.contentionEvents.push({ 'key': key, 'queueSize': queueSize });
  }
}

class AfterReleaseTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AfterReleaseTrackingMutex {
    const built = new AfterReleaseTrackingMutex(config);
    return built;
  }
  readonly afterReleaseEvents: string[] = [];

  protected override afterRelease(key: string): void {
    this.afterReleaseEvents.push(key);
  }
}

class AfterReleaseHandoffTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AfterReleaseHandoffTrackingMutex {
    const built = new AfterReleaseHandoffTrackingMutex(config);
    return built;
  }
  readonly afterReleaseEvents: string[] = [];
  readonly onReleaseEvents: string[] = [];

  protected override afterRelease(key: string): void {
    this.afterReleaseEvents.push(key);
  }

  protected override onRelease(key: string): void {
    this.onReleaseEvents.push(key);
  }
}

class HookErrorRecordingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): HookErrorRecordingMutex {
    const built = new HookErrorRecordingMutex(config);
    return built;
  }
  protected override beforeAcquire(_key: string): void {
    throw RuntimeError.create('beforeAcquire boom');
  }

  getHookErrorCount(): number {
    const count = this.hooks.hookErrorCount;
    return count;
  }

  getHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }
}

class ThrowingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ThrowingMutex {
    const built = new ThrowingMutex(config);
    return built;
  }
  protected override afterAcquire(_key: string, _waitTimeMs: number): void {
    throw RuntimeError.create('Hook error');
  }

  protected override beforeRelease(_key: string, _holdTimeMs: number): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingQueueMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ThrowingQueueMutex {
    const built = new ThrowingQueueMutex(config);
    return built;
  }
  readonly acquireKeys: string[] = [];

  protected override afterAcquire(key: string, _waitTimeMs: number): void {
    this.acquireKeys.push(`acquired-${key}`);

    if (key === 'key1') {
      throw RuntimeError.create('Hook error');
    }
  }
}

class AllHooksMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AllHooksMutex {
    const built = new AllHooksMutex(config);
    return built;
  }
  readonly acquired: number[] = [];
  readonly released: number[] = [];
  totalHoldTime = 0;
  totalWaitTime = 0;

  protected override afterAcquire(_key: string, waitTimeMs: number): void {
    this.acquired.push(waitTimeMs);
    this.totalWaitTime += waitTimeMs;
  }

  protected override beforeRelease(_key: string, holdTimeMs: number): void {
    this.released.push(holdTimeMs);
    this.totalHoldTime += holdTimeMs;
  }
}

/**
 * Installs an instance-level async hook per lifecycle hook name. The base class declares each hook as
 * `void`; an async hook proves the invoker records a hook's asynchronous rejection instead of leaking it.
 */
class AsyncRejectingHooksMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AsyncRejectingHooksMutex {
    const built = new AsyncRejectingHooksMutex(config);
    return built;
  }

  protected override async afterAcquire(): Promise<void> {
    await this.#rejectWith('afterAcquire async boom');
  }

  protected override async afterRelease(): Promise<void> {
    await this.#rejectWith('afterRelease async boom');
  }

  protected override async beforeAcquire(): Promise<void> {
    await this.#rejectWith('beforeAcquire async boom');
  }

  protected override async beforeRelease(): Promise<void> {
    await this.#rejectWith('beforeRelease async boom');
  }

  protected override async onAcquireWait(): Promise<void> {
    await this.#rejectWith('onAcquireWait async boom');
  }

  protected override async onContended(): Promise<void> {
    await this.#rejectWith('onContended async boom');
  }

  protected override async onEnterKey(): Promise<void> {
    await this.#rejectWith('onEnterKey async boom');
  }

  protected override async onQueueDrain(): Promise<void> {
    await this.#rejectWith('onQueueDrain async boom');
  }

  protected override async onRelease(): Promise<void> {
    await this.#rejectWith('onRelease async boom');
  }

  protected override async onTimeout(): Promise<void> {
    await this.#rejectWith('onTimeout async boom');
  }

  getHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }

  async #rejectWith(message: string): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create(message);
  }
}

class AcquireWaitTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): AcquireWaitTrackingMutex {
    const built = new AcquireWaitTrackingMutex(config);
    return built;
  }
  readonly acquireWaitEvents: { 'key': string; 'waitTimeMs': number }[] = [];

  protected override onAcquireWait(key: string, waitTimeMs: number): void {
    this.acquireWaitEvents.push({ 'key': key, 'waitTimeMs': waitTimeMs });
  }
}

class ReleaseHookTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ReleaseHookTrackingMutex {
    const built = new ReleaseHookTrackingMutex(config);
    return built;
  }
  readonly onReleaseEvents: string[] = [];

  protected override onRelease(key: string): void {
    this.onReleaseEvents.push(key);
  }
}

class QueueDrainTrackingMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): QueueDrainTrackingMutex {
    const built = new QueueDrainTrackingMutex(config);
    return built;
  }
  readonly queueDrainEvents: string[] = [];

  protected override onQueueDrain(key: string): void {
    this.queueDrainEvents.push(key);
  }
}

class ThrowingReleaseHookMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ThrowingReleaseHookMutex {
    const built = new ThrowingReleaseHookMutex(config);
    return built;
  }
  protected override onRelease(): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingQueueDrainMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ThrowingQueueDrainMutex {
    const built = new ThrowingQueueDrainMutex(config);
    return built;
  }
  protected override onQueueDrain(): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingTimeoutHookMutex extends Mutex<string> {
  static build(config?: Parameters<typeof Mutex.create>[0]): ThrowingTimeoutHookMutex {
    const built = new ThrowingTimeoutHookMutex(config);
    return built;
  }
  protected override onTimeout(): void {
    throw RuntimeError.create('Hook error');
  }
}

class ObservabilityRunners {
  private static readonly mutexErrorTypes = new Map<string, typeof LockTimeoutError>([
    ['LockTimeoutError', LockTimeoutError]
  ]);

  static async 'afterAcquire-error-does-not-stop-queue'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'afterAcquire-error-does-not-stop-queue'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ThrowingQueueMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.deepStrictEqual(mutex.acquireKeys, scenarioCase.expected.acquiredKeys);
    assert.strictEqual(
      mutex.acquireKeys.length === pending.length + 1,
      scenarioCase.expected.queueContinues
    );
  }

  static async 'afterAcquire-immediate'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'afterAcquire-immediate'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AcquireTrackingMutex.build({
      'clock': VirtualClockProvider.create(VirtualTimeCounter.create())
    });
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.acquireEvents.length, scenarioCase.expected.acquireEvents);
    const event = ScenarioValues.requireDefined(mutex.acquireEvents[0], 'Acquire events[0]');
    assert.strictEqual(event.key, key);
    assert.strictEqual(event.waitTimeMs, scenarioCase.expected.waitTimeMs);
    release();
  }

  static async 'afterAcquire-separate-keys'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'afterAcquire-separate-keys'
    >
  ): Promise<void> {
    const mutex = AcquireTrackingMutex.build();
    const releases = await ObservabilityRunners.acquireAll(mutex, scenarioCase.input.keys);
    const acquiredKeys: string[] = [];
    for (let index = 0; index < mutex.acquireEvents.length; index += 1) {
      acquiredKeys.push(
        ScenarioValues.requireDefined(mutex.acquireEvents[index], 'acquireEvents[index]').key
      );
    }
    assert.deepStrictEqual(acquiredKeys, scenarioCase.expected.acquireEvents);
    ObservabilityRunners.releaseAll(releases);
  }

  static async 'afterAcquire-waiting'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'afterAcquire-waiting'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AcquireTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    await setTimeout(scenarioCase.input.waitMs);
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireEvents.length, scenarioCase.expected.acquireEvents);
    const event = ScenarioValues.requireDefined(mutex.acquireEvents[1], 'Acquire events[1]');
    assert.strictEqual(event.key, key);
    assert.ok(event.waitTimeMs >= scenarioCase.expected.secondWaitTimeMsMinimum);
  }

  static async 'afterRelease-fires'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'afterRelease-fires'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AfterReleaseTrackingMutex.build();
    const release = await mutex.acquire(key);
    release();
    assert.deepStrictEqual(mutex.afterReleaseEvents, scenarioCase.expected.afterReleaseEvents);
  }

  static async 'afterRelease-fires-on-handoff-and-drop'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'afterRelease-fires-on-handoff-and-drop'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AfterReleaseHandoffTrackingMutex.build();
    const holderRelease = await mutex.acquire(key);
    const waiterAcquire = mutex.acquire(key);
    await setTimeout(0);

    // Releasing the holder hands the lock straight to the queued waiter,
    // and afterRelease fires for that handoff.
    holderRelease();
    await setTimeout(0);
    assert.deepStrictEqual(
      mutex.afterReleaseEvents,
      scenarioCase.expected.afterReleaseEventsAfterHandoff
    );

    // Releasing the waiter drops the lock with nobody left queued;
    // afterRelease fires again, once per release.
    const waiterRelease = await waiterAcquire;
    waiterRelease();
    assert.deepStrictEqual(
      mutex.afterReleaseEvents,
      scenarioCase.expected.afterReleaseEventsAfterDrop
    );
    assert.deepStrictEqual(mutex.onReleaseEvents, scenarioCase.expected.onReleaseEventsAfterDrop);
  }

  static async 'async-hook-rejections-are-recorded'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'async-hook-rejections-are-recorded'
    >
  ): Promise<void> {
    const queuedKey = ScenarioValues.requireDefined(scenarioCase.input.keys[0], 'input.keys[0]');
    const timeoutKey = ScenarioValues.requireDefined(scenarioCase.input.keys[1], 'input.keys[1]');
    const pendingCount = ScenarioValues.requireDefined(
      scenarioCase.input.batch.pendingCount,
      'input.batch.pendingCount'
    );
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandledRejections.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const mutex = AsyncRejectingHooksMutex.build(scenarioCase.input.mutex);
      const releaseLeader = await mutex.acquire(queuedKey);
      const pending = ObservabilityRunners.createAcquireBatch(mutex, queuedKey, pendingCount);
      releaseLeader();
      await ObservabilityRunners.releaseQueuedInOrder(pending);
      const releaseTimeoutLeader = await mutex.acquire(timeoutKey);
      const timeoutWaiters = ObservabilityRunners.createAcquireBatch(
        mutex,
        timeoutKey,
        pendingCount
      );
      for (let index = 0; index < timeoutWaiters.length; index += 1) {
        await assert.rejects(
          ScenarioValues.requireDefined(timeoutWaiters[index], 'timeoutWaiters[index]'),
          LockTimeoutError
        );
      }
      releaseTimeoutLeader();
      await setImmediate();
      await setImmediate();
      assert.strictEqual(mutex.isComplete(), true);
      assert.strictEqual(unhandledRejections.length, scenarioCase.expected.unhandledRejections);
      const hookNames = new Set<string>();
      const hookErrors = mutex.getHookErrors();
      for (let index = 0; index < hookErrors.length; index += 1) {
        hookNames.add(
          ScenarioValues.requireDefined(hookErrors[index], 'hookErrors[index]').hookName
        );
      }
      for (let index = 0; index < scenarioCase.expected.hookNames.length; index += 1) {
        const hookName = ScenarioValues.requireDefined(
          scenarioCase.expected.hookNames[index],
          'expected.hookNames[index]'
        );
        assert.strictEqual(
          hookNames.has(hookName),
          true,
          `expected an async rejection recorded for ${hookName}`
        );
      }
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'beforeAcquire-error-is-recorded'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'beforeAcquire-error-is-recorded'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = HookErrorRecordingMutex.build();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    const hookErrors = mutex.getHookErrors();
    assert.strictEqual(mutex.getHookErrorCount(), scenarioCase.expected.hookErrorCount);
    assert.strictEqual(hookErrors.length, scenarioCase.expected.hookErrorCount);
    const hookError = ScenarioValues.requireDefined(hookErrors[0], 'Hook errors[0]');
    assert.ok(hookError instanceof HookInvocationError);
    assert.strictEqual(hookError.hookName, scenarioCase.expected.hookName);
    const cause: unknown = hookError.cause;
    assert.ok(cause instanceof Error);
    assert.strictEqual(cause.message, 'beforeAcquire boom');
    release();
  }

  static async 'beforeRelease-fires'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'beforeRelease-fires'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ReleaseTrackingMutex.build();
    const release = await mutex.acquire(key);
    await setTimeout(ScenarioValues.requireNumber(scenarioCase.input.holdMs, 'input.holdMs'));
    release();
    assert.strictEqual(mutex.releaseEvents.length, scenarioCase.expected.releaseEvents);
    const event = ScenarioValues.requireDefined(mutex.releaseEvents[0], 'Release events[0]');
    assert.strictEqual(event.key, key);
    assert.ok(event.holdTimeMs >= scenarioCase.expected.holdTimeMsMinimum);
  }

  static async 'beforeRelease-tracks-hold-time'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'beforeRelease-tracks-hold-time'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const holdTimes = ScenarioValues.requireNumberArray(scenarioCase.input.holdMs, 'input.holdMs');
    const mutex = ReleaseTrackingMutex.build();
    for (let index = 0; index < holdTimes.length; index += 1) {
      const release = await mutex.acquire(key);
      await setTimeout(ScenarioValues.requireDefined(holdTimes[index], 'holdTimes[index]'));
      release();
    }
    assert.strictEqual(mutex.releaseEvents.length, scenarioCase.expected.releaseEvents);
    for (let index = 0; index < mutex.releaseEvents.length; index += 1) {
      assert.ok(
        ScenarioValues.requireDefined(mutex.releaseEvents[index], 'releaseEvents[index]')
          .holdTimeMs >= scenarioCase.expected.holdTimeMsMinimum
      );
    }
  }

  static async 'hook-errors-do-not-break-locking'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'hook-errors-do-not-break-locking'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ThrowingMutex.build();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    release();
    assert.strictEqual(mutex.isLocked(key) === false, scenarioCase.expected.released);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  }

  static async 'onAcquireWait-not-immediate'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onAcquireWait-not-immediate'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AcquireWaitTrackingMutex.build();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
    release();
  }

  static async 'onAcquireWait-per-waiter'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onAcquireWait-per-waiter'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AcquireWaitTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
  }

  static async 'onAcquireWait-queued'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onAcquireWait-queued'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = AcquireWaitTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    await setTimeout(10);
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
    const event = ScenarioValues.requireDefined(
      mutex.acquireWaitEvents[0],
      'Acquire wait events[0]'
    );
    assert.strictEqual(event.key, key);
    assert.ok(event.waitTimeMs >= 0);
  }

  static async 'onContended-fires'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onContended-fires'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ContentionTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    assert.strictEqual(mutex.contentionEvents.length, scenarioCase.expected.contentionEvents);
    const event = ScenarioValues.requireDefined(mutex.contentionEvents[0], 'Contention events[0]');
    assert.strictEqual(event.key, key);
    assert.strictEqual(event.queueSize, scenarioCase.expected.queueSize);
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
  }

  static async 'onQueueDrain-normal'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onQueueDrain-normal'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = QueueDrainTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
    assert.strictEqual(mutex.queueDrainEvents[0], key);
  }

  static async 'onQueueDrain-not-early'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onQueueDrain-not-early'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = QueueDrainTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    release();
    const firstRelease = await ScenarioValues.requireDefined(pending[0], 'Pending acquisitions[0]');
    assert.strictEqual(mutex.queueDrainEvents.length, 0);
    firstRelease();
    await ObservabilityRunners.releaseQueuedInOrder(pending.slice(1));
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
  }

  static async 'onQueueDrain-throw-does-not-replace-handoff'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onQueueDrain-throw-does-not-replace-handoff'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ThrowingQueueDrainMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    release();
    await ObservabilityRunners.releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  }

  static async 'onQueueDrain-timeout'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onQueueDrain-timeout'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = QueueDrainTrackingMutex.build(scenarioCase.input.mutex);
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    for (let index = 0; index < pending.length; index += 1) {
      await assert.rejects(
        ScenarioValues.requireDefined(pending[index], 'pending[index]'),
        LockTimeoutError
      );
    }
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
    assert.strictEqual(mutex.queueDrainEvents[0], key);
    release();
  }

  static async 'onRelease-every-release'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onRelease-every-release'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ReleaseHookTrackingMutex.build();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.onReleaseEvents.length, scenarioCase.expected.onReleaseCount);
    assert.strictEqual(mutex.onReleaseEvents[0], key);
  }

  static async 'onRelease-handoff'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onRelease-handoff'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ReleaseHookTrackingMutex.build();
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    assert.strictEqual(mutex.onReleaseEvents.length, 0);
    release();
    assert.strictEqual(mutex.onReleaseEvents.length, scenarioCase.expected.onReleaseCount);
    assert.strictEqual(mutex.onReleaseEvents[0], key);
    await ObservabilityRunners.releaseQueuedInOrder(pending);
  }

  static async 'onRelease-throw-does-not-replace-release'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onRelease-throw-does-not-replace-release'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ThrowingReleaseHookMutex.build();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  }

  static async 'onTimeout-fires'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'onTimeout-fires'>
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = TimeoutTrackingMutex.build(scenarioCase.input.mutex);
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    for (let index = 0; index < pending.length; index += 1) {
      await assert.rejects(
        ScenarioValues.requireDefined(pending[index], 'pending[index]'),
        LockTimeoutError
      );
    }
    assert.strictEqual(mutex.timeoutEvents.length, pending.length);
    const event = ScenarioValues.requireDefined(mutex.timeoutEvents[0], 'Timeout events[0]');
    assert.strictEqual(event.key, key);
    assert.strictEqual(event.timeoutMs, scenarioCase.expected.timeoutMs);
    release();
  }

  static async 'onTimeout-throw-does-not-replace-error'(
    scenarioCase: ScenarioCaseOfType<
      ObservabilityScenarioCaseEntity.Type,
      'onTimeout-throw-does-not-replace-error'
    >
  ): Promise<void> {
    const key = scenarioCase.input.key;
    const mutex = ThrowingTimeoutHookMutex.build(scenarioCase.input.mutex);
    const release = await mutex.acquire(key);
    const pending = ObservabilityRunners.createAcquireBatch(
      mutex,
      key,
      ScenarioValues.requireDefined(
        scenarioCase.input.batch.pendingCount,
        'input.batch.pendingCount'
      )
    );
    const errorType = ScenarioValues.requireDefined(
      ObservabilityRunners.mutexErrorTypes.get(scenarioCase.expected.errorName),
      `Unknown mutex error type name: ${scenarioCase.expected.errorName}`
    );
    for (let index = 0; index < pending.length; index += 1) {
      await assert.rejects(
        ScenarioValues.requireDefined(pending[index], 'pending[index]'),
        errorType
      );
    }
    release();
  }

  static async 'tracks-all-metrics'(
    scenarioCase: ScenarioCaseOfType<ObservabilityScenarioCaseEntity.Type, 'tracks-all-metrics'>
  ): Promise<void> {
    const firstKey = ScenarioValues.requireDefined(scenarioCase.input.keys[0], 'input.keys[0]');
    const secondKey = ScenarioValues.requireDefined(scenarioCase.input.keys[1], 'input.keys[1]');
    const holdMs = ScenarioValues.requireNumber(scenarioCase.input.holdMs, 'input.holdMs');
    const mutex = AllHooksMutex.build();
    const release1 = await mutex.acquire(firstKey);
    await setTimeout(holdMs);
    release1();
    const release2 = await mutex.acquire(secondKey);
    release2();
    assert.strictEqual(mutex.acquired.length, scenarioCase.expected.acquiredCount);
    assert.strictEqual(mutex.released.length, scenarioCase.expected.releasedCount);
    assert.ok(mutex.totalHoldTime >= holdMs - 10);
  }

  private static async acquireAll(
    mutex: Mutex<string>,
    keys: readonly string[]
  ): Promise<(() => void)[]> {
    const pending: Promise<() => void>[] = [];
    for (let index = 0; index < keys.length; index += 1) {
      pending.push(mutex.acquire(ScenarioValues.requireDefined(keys[index], 'keys[index]')));
    }
    const releases = await Promise.all(pending);
    return releases;
  }

  private static createAcquireBatch(
    mutex: Mutex<string>,
    key: string,
    count: number
  ): Promise<() => void>[] {
    const acquisitions: Promise<() => void>[] = [];
    for (let index = 0; index < count; index += 1) {
      acquisitions.push(mutex.acquire(key));
    }
    return acquisitions;
  }

  private static releaseAll(releases: readonly (() => void)[]): void {
    for (let index = 0; index < releases.length; index += 1) {
      ScenarioValues.requireDefined(releases[index], 'releases[index]')();
    }
  }

  private static async releaseQueuedInOrder(
    acquisitions: readonly Promise<() => void>[]
  ): Promise<void> {
    for (let index = 0; index < acquisitions.length; index += 1) {
      const release = await ScenarioValues.requireDefined(
        acquisitions[index],
        'acquisitions[index]'
      );
      release();
    }
  }
}

ScenarioSuite.register({
  'entity': ObservabilityScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Mutex observability',
  'runners': ObservabilityRunners
});
