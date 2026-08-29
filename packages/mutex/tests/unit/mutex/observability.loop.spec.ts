import { RuntimeError, HookInvocationError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';



import type { MutexConfigEntity } from '../../../src/entities/MutexConfigEntity.js';
import { LockTimeoutError } from '../../../src/errors/index.js';
import { Mutex } from '../../../src/mutex/index.js';
import scenarioGroups from './observability.scenarios.json' with { type: 'json' };

type BatchInput = {
  pendingCount?: number;
};

type MutexScenarioInput = Record<string, unknown> & {
  batch?: BatchInput;
  holdMs?: number | number[];
  key?: string;
  keys?: string[];
  mutex?: Record<string, unknown>;
  waitMs?: number;
};

type ScenarioData = {
  description: string;
  expected: Record<string, unknown>;
  input: MutexScenarioInput;
  name: string;
};

type ScenarioShape =
  | 'afterAcquire-error-does-not-stop-queue'
  | 'afterAcquire-immediate'
  | 'afterAcquire-separate-keys'
  | 'afterAcquire-waiting'
  | 'afterRelease-fires'
  | 'afterRelease-fires-on-handoff-and-drop'
  | 'async-hook-rejections-are-recorded'
  | 'beforeAcquire-error-is-recorded'
  | 'beforeRelease-fires'
  | 'beforeRelease-tracks-hold-time'
  | 'hook-errors-do-not-break-locking'
  | 'onAcquireWait-not-immediate'
  | 'onAcquireWait-per-waiter'
  | 'onAcquireWait-queued'
  | 'onContended-fires'
  | 'onQueueDrain-normal'
  | 'onQueueDrain-not-early'
  | 'onQueueDrain-throw-does-not-replace-handoff'
  | 'onQueueDrain-timeout'
  | 'onRelease-every-release'
  | 'onRelease-handoff'
  | 'onRelease-throw-does-not-replace-release'
  | 'onTimeout-fires'
  | 'onTimeout-throw-does-not-replace-error'
  | 'tracks-all-metrics';

type ScenarioCase = ScenarioData & { shape: ScenarioShape };
type ReleaseFunction = () => void;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;
type AnyErrorConstructor = new (...args: never[]) => Error;

const mutexErrorTypes = {
  'LockTimeoutError': LockTimeoutError
} satisfies Record<string, AnyErrorConstructor>;

function isMutexErrorTypeName(value: string): value is keyof typeof mutexErrorTypes {
  return Object.hasOwn(mutexErrorTypes, value);
}

function mutexErrorTypeInput(value: string): (typeof mutexErrorTypes)[keyof typeof mutexErrorTypes] {
  if (!isMutexErrorTypeName(value)) {
    throw RuntimeError.create(`Unknown mutex error type name: ${value}`);
  }
  return mutexErrorTypes[value];
}

class AcquireTrackingMutex extends Mutex<string> {
  readonly acquireEvents: Array<{ key: string; waitTimeMs: number }> = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    this.acquireEvents.push({ key, waitTimeMs });
  }
}

class ReleaseTrackingMutex extends Mutex<string> {
  readonly releaseEvents: Array<{ holdTimeMs: number; key: string }> = [];

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    this.releaseEvents.push({ holdTimeMs, key });
  }
}

class TimeoutTrackingMutex extends Mutex<string> {
  readonly timeoutEvents: Array<{ key: string; timeoutMs: number }> = [];

  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ key, timeoutMs });
  }
}

class ContentionTrackingMutex extends Mutex<string> {
  readonly contentionEvents: Array<{ key: string; queueSize: number }> = [];

  protected override onContended(key: string, queueSize: number): void {
    this.contentionEvents.push({ key, queueSize });
  }
}

class AfterReleaseTrackingMutex extends Mutex<string> {
  readonly afterReleaseEvents: string[] = [];

  protected override afterRelease(key: string): void {
    this.afterReleaseEvents.push(key);
  }
}

class AfterReleaseHandoffTrackingMutex extends Mutex<string> {
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
  protected override beforeAcquire(_key: string): void {
    throw RuntimeError.create('beforeAcquire boom');
  }

  getHookErrorCount(): number {
    return this.hooks.hookErrorCount;
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }
}

class ThrowingMutex extends Mutex<string> {
  protected override afterAcquire(_key: string, _waitTimeMs: number): void {
    throw RuntimeError.create('Hook error');
  }

  protected override beforeRelease(_key: string, _holdTimeMs: number): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingQueueMutex extends Mutex<string> {
  readonly acquireKeys: string[] = [];

  protected override afterAcquire(key: string, _waitTimeMs: number): void {
    this.acquireKeys.push(`acquired-${key}`);

    if (key === 'key1') {
      throw RuntimeError.create('Hook error');
    }
  }
}

class AllHooksMutex extends Mutex<string> {
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

class AsyncRejectingHooksMutex extends Mutex<string> {
  protected override async beforeAcquire(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('beforeAcquire async boom');
  }

  protected override async afterAcquire(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('afterAcquire async boom');
  }

  protected override async onContended(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onContended async boom');
  }

  protected override async beforeRelease(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('beforeRelease async boom');
  }

  protected override async afterRelease(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('afterRelease async boom');
  }

  protected override async onTimeout(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onTimeout async boom');
  }

  protected override async onAcquireWait(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onAcquireWait async boom');
  }

  protected override async onRelease(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onRelease async boom');
  }

  protected override async onQueueDrain(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onQueueDrain async boom');
  }

  protected override async onEnterKey(): Promise<void> {
    await Promise.resolve();
    throw RuntimeError.create('onEnterKey async boom');
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }
}

class AcquireWaitTrackingMutex extends Mutex<string> {
  readonly acquireWaitEvents: Array<{ key: string; waitTimeMs: number }> = [];

  protected override onAcquireWait(key: string, waitTimeMs: number): void {
    this.acquireWaitEvents.push({ key, waitTimeMs });
  }
}

class ReleaseHookTrackingMutex extends Mutex<string> {
  readonly onReleaseEvents: string[] = [];

  protected override onRelease(key: string): void {
    this.onReleaseEvents.push(key);
  }
}

class QueueDrainTrackingMutex extends Mutex<string> {
  readonly queueDrainEvents: string[] = [];

  protected override onQueueDrain(key: string): void {
    this.queueDrainEvents.push(key);
  }
}

class ThrowingReleaseHookMutex extends Mutex<string> {
  protected override onRelease(): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingQueueDrainMutex extends Mutex<string> {
  protected override onQueueDrain(): void {
    throw RuntimeError.create('Hook error');
  }
}

class ThrowingTimeoutHookMutex extends Mutex<string> {
  protected override onTimeout(): void {
    throw RuntimeError.create('Hook error');
  }
}

function mutexConfig(scenarioCase: ScenarioCase): Partial<MutexConfigEntity.Type> {
  return (scenarioCase.input.mutex ?? {}) as Partial<MutexConfigEntity.Type>;
}

function readPendingCount(input: MutexScenarioInput): number {
  const value = input.batch?.pendingCount;
  if (typeof value !== 'number') {
    throw RuntimeError.create('Scenario input.batch.pendingCount must be a number');
  }
  return value;
}

function readNumber<TValue>(value: TValue, label: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(`${label} must be a number`);
  }
  return value;
}

function readBoolean<TValue>(value: TValue, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw RuntimeError.create(`${label} must be a boolean`);
  }
  return value;
}

function readString<TValue>(value: TValue, label: string): string {
  if (typeof value !== 'string') {
    throw RuntimeError.create(`${label} must be a string`);
  }
  return value;
}

function readStringArray<TValue>(value: TValue, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw RuntimeError.create(`${label} must be a string array`);
  }
  return value;
}

function readNumberArray<TValue>(value: TValue, label: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) {
    throw RuntimeError.create(`${label} must be a number array`);
  }
  return value;
}

function readStringKey(input: MutexScenarioInput): string {
  return readString(input.key, 'Scenario input.key');
}

function readStringKeys(input: MutexScenarioInput): string[] {
  return readStringArray(input.keys, 'Scenario input.keys');
}

function readArrayItem<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (item === undefined) {
    throw RuntimeError.create(`${label} is missing item ${index}`);
  }
  return item;
}

function createAcquireBatch(
  count: number,
  acquire: () => Promise<ReleaseFunction>
): Array<Promise<ReleaseFunction>> {
  return Array.from({ length: count }, () => acquire());
}

async function releaseQueuedInOrder(acquisitions: Iterable<Promise<ReleaseFunction>>): Promise<void> {
  for (const acquisition of acquisitions) {
    const release = await acquisition;
    release();
  }
}

function releaseAll(releases: Iterable<ReleaseFunction>): void {
  for (const release of releases) {
    release();
  }
}

async function waitForHookRejections(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
  await new Promise((resolve) => { setImmediate(resolve); });
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'afterAcquire-error-does-not-stop-queue': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ThrowingQueueMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.deepStrictEqual(mutex.acquireKeys, scenarioCase.expected.acquiredKeys);
    assert.strictEqual(
      mutex.acquireKeys.length === pending.length + 1,
      readBoolean(scenarioCase.expected.queueContinues, 'Scenario expected.queueContinues')
    );
  },
  'afterAcquire-immediate': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AcquireTrackingMutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.acquireEvents.length, scenarioCase.expected.acquireEvents);
    const ev = readArrayItem(mutex.acquireEvents, 0, 'Acquire events');
    assert.strictEqual(ev.key, key);
    assert.ok(ev.waitTimeMs >= 0);
    assert.ok(ev.waitTimeMs < readNumber(scenarioCase.expected.waitTimeMsMax, 'Scenario expected.waitTimeMsMax'));
    release();
  },
  'afterAcquire-separate-keys': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const mutex = AcquireTrackingMutex.create();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assert.deepStrictEqual(mutex.acquireEvents.map((event) => event.key), scenarioCase.expected.acquireEvents);
    releaseAll(releases);
  },
  'afterAcquire-waiting': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AcquireTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    await delay(readNumber(scenarioCase.input.waitMs, 'Scenario input.waitMs'));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireEvents.length, scenarioCase.expected.acquireEvents);
    const ev = readArrayItem(mutex.acquireEvents, 1, 'Acquire events');
    assert.strictEqual(ev.key, key);
    assert.ok(ev.waitTimeMs >= readNumber(scenarioCase.expected.secondWaitTimeMsMin, 'Scenario expected.secondWaitTimeMsMin'));
  },
  'afterRelease-fires': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AfterReleaseTrackingMutex.create();
    const release = await mutex.acquire(key);
    release();
    assert.deepStrictEqual(mutex.afterReleaseEvents, scenarioCase.expected.afterReleaseEvents);
  },
  'afterRelease-fires-on-handoff-and-drop': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AfterReleaseHandoffTrackingMutex.create();
    const holderRelease = await mutex.acquire(key);
    const waiterAcquire = mutex.acquire(key);
    await delay(0);

    // Releasing the holder hands the lock straight to the queued waiter —
    // this is the outcome afterRelease used to silently skip entirely.
    holderRelease();
    await delay(0);
    assert.deepStrictEqual(mutex.afterReleaseEvents, scenarioCase.expected.afterReleaseEventsAfterHandoff);

    // Releasing the waiter now drops the lock with nobody left queued —
    // afterRelease must fire again (not skip, and not have already fired
    // twice for the handoff above).
    const waiterRelease = await waiterAcquire;
    waiterRelease();
    assert.deepStrictEqual(mutex.afterReleaseEvents, scenarioCase.expected.afterReleaseEventsAfterDrop);
    assert.deepStrictEqual(mutex.onReleaseEvents, scenarioCase.expected.onReleaseEventsAfterDrop);
  },
  'async-hook-rejections-are-recorded': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const queuedKey = readArrayItem(keys, 0, 'Scenario input.keys');
    const timeoutKey = readArrayItem(keys, 1, 'Scenario input.keys');
    const pendingCount = readPendingCount(scenarioCase.input);
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = <TReason>(reason: TReason): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const mutex = AsyncRejectingHooksMutex.create(mutexConfig(scenarioCase));
      const releaseLeader = await mutex.acquire(queuedKey);
      const pending = createAcquireBatch(pendingCount, () => mutex.acquire(queuedKey));
      releaseLeader();
      await releaseQueuedInOrder(pending);
      const releaseTimeoutLeader = await mutex.acquire(timeoutKey);
      const timeoutWaiters = createAcquireBatch(pendingCount, () => mutex.acquire(timeoutKey));
      for (const waiter of timeoutWaiters) {
        await assert.rejects(waiter, LockTimeoutError);
      }
      releaseTimeoutLeader();
      await waitForHookRejections();
      assert.strictEqual(mutex.isComplete(), true);
      assert.strictEqual(unhandledRejections.length, scenarioCase.expected.unhandledRejections);
      const hookNames = new Set(mutex.getHookErrors().map((error) => error.hookName));
      for (const hookName of readStringArray(scenarioCase.expected.hookNames, 'Scenario expected.hookNames')) {
        assert.strictEqual(hookNames.has(hookName), true, `expected an async rejection recorded for ${hookName}`);
      }
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'beforeAcquire-error-is-recorded': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = HookErrorRecordingMutex.create();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    const errors = mutex.getHookErrors();
    assert.strictEqual(mutex.getHookErrorCount(), scenarioCase.expected.hookErrorCount);
    assert.strictEqual(errors.length, scenarioCase.expected.hookErrorCount);
    const err = readArrayItem(errors, 0, 'Hook errors');
    assert.ok(err instanceof HookInvocationError);
    assert.strictEqual(err.hookName, scenarioCase.expected.hookName);
    const { cause } = err;
    assert.ok(cause instanceof Error);
    assert.strictEqual(cause.message, 'beforeAcquire boom');
    release();
  },
  'beforeRelease-fires': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ReleaseTrackingMutex.create();
    const release = await mutex.acquire(key);
    await delay(readNumber(scenarioCase.input.holdMs, 'Scenario input.holdMs'));
    release();
    assert.strictEqual(mutex.releaseEvents.length, scenarioCase.expected.releaseEvents);
    const ev = readArrayItem(mutex.releaseEvents, 0, 'Release events');
    assert.strictEqual(ev.key, key);
    assert.ok(ev.holdTimeMs >= readNumber(scenarioCase.expected.holdTimeMsMin, 'Scenario expected.holdTimeMsMin'));
  },
  'beforeRelease-tracks-hold-time': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const holdTimes = readNumberArray(scenarioCase.input.holdMs, 'Scenario input.holdMs');
    const mutex = ReleaseTrackingMutex.create();
    for (const holdMs of holdTimes) {
      const release = await mutex.acquire(key);
      await delay(holdMs);
      release();
    }
    assert.strictEqual(mutex.releaseEvents.length, scenarioCase.expected.releaseEvents);
    for (const event of mutex.releaseEvents) {
      assert.ok(event.holdTimeMs >= readNumber(scenarioCase.expected.holdTimeMsMin, 'Scenario expected.holdTimeMsMin'));
    }
  },
  'hook-errors-do-not-break-locking': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ThrowingMutex.create();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    release();
    assert.strictEqual(!mutex.isLocked(key), scenarioCase.expected.released);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onAcquireWait-not-immediate': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AcquireWaitTrackingMutex.create();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
    release();
  },
  'onAcquireWait-per-waiter': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AcquireWaitTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
  },
  'onAcquireWait-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = AcquireWaitTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    await delay(10);
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
    const ev = readArrayItem(mutex.acquireWaitEvents, 0, 'Acquire wait events');
    assert.strictEqual(ev.key, key);
    assert.ok(ev.waitTimeMs >= 0);
  },
  'onContended-fires': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ContentionTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    assert.strictEqual(mutex.contentionEvents.length, scenarioCase.expected.contentionEvents);
    const ev = readArrayItem(mutex.contentionEvents, 0, 'Contention events');
    assert.strictEqual(ev.key, key);
    assert.strictEqual(ev.queueSize, scenarioCase.expected.queueSize);
    release();
    await releaseQueuedInOrder(pending);
  },
  'onQueueDrain-normal': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = QueueDrainTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
    assert.strictEqual(mutex.queueDrainEvents[0], key);
  },
  'onQueueDrain-not-early': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const pendingCount = readPendingCount(scenarioCase.input);
    const mutex = QueueDrainTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(pendingCount, () => mutex.acquire(key));
    release();
    const firstRelease = await readArrayItem(pending, 0, 'Pending acquisitions');
    assert.strictEqual(mutex.queueDrainEvents.length, 0);
    firstRelease();
    await releaseQueuedInOrder(pending.slice(1));
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
  },
  'onQueueDrain-throw-does-not-replace-handoff': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ThrowingQueueDrainMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onQueueDrain-timeout': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = QueueDrainTrackingMutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    for (const waiter of pending) {
      await assert.rejects(waiter, LockTimeoutError);
    }
    assert.strictEqual(mutex.queueDrainEvents.length, scenarioCase.expected.queueDrainCount);
    assert.strictEqual(mutex.queueDrainEvents[0], key);
    release();
  },
  'onRelease-every-release': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ReleaseHookTrackingMutex.create();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.onReleaseEvents.length, scenarioCase.expected.onReleaseCount);
    assert.strictEqual(mutex.onReleaseEvents[0], key);
  },
  'onRelease-handoff': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ReleaseHookTrackingMutex.create();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    assert.strictEqual(mutex.onReleaseEvents.length, 0);
    release();
    assert.strictEqual(mutex.onReleaseEvents.length, scenarioCase.expected.onReleaseCount);
    assert.strictEqual(mutex.onReleaseEvents[0], key);
    await releaseQueuedInOrder(pending);
  },
  'onRelease-throw-does-not-replace-release': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ThrowingReleaseHookMutex.create();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onTimeout-fires': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = TimeoutTrackingMutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    for (const waiter of pending) {
      await assert.rejects(waiter, LockTimeoutError);
    }
    assert.strictEqual(mutex.timeoutEvents.length, pending.length);
    const ev = readArrayItem(mutex.timeoutEvents, 0, 'Timeout events');
    assert.strictEqual(ev.key, key);
    assert.strictEqual(ev.timeoutMs, scenarioCase.expected.timeoutMs);
    release();
  },
  'onTimeout-throw-does-not-replace-error': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = ThrowingTimeoutHookMutex.create(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    const errorType = mutexErrorTypeInput(readString(scenarioCase.expected.errorName, 'Scenario expected.errorName'));
    for (const waiter of pending) {
      await assert.rejects(waiter, errorType);
    }
    release();
  },
  'tracks-all-metrics': async (scenarioCase) => {
    const keys = readStringKeys(scenarioCase.input);
    const firstKey = readArrayItem(keys, 0, 'Scenario input.keys');
    const secondKey = readArrayItem(keys, 1, 'Scenario input.keys');
    const holdMs = readNumber(scenarioCase.input.holdMs, 'Scenario input.holdMs');
    const mutex = AllHooksMutex.create();
    const release1 = await mutex.acquire(firstKey);
    await delay(holdMs);
    release1();
    const release2 = await mutex.acquire(secondKey);
    release2();
    assert.strictEqual(mutex.acquired.length, scenarioCase.expected.acquiredCount);
    assert.strictEqual(mutex.released.length, scenarioCase.expected.releasedCount);
    assert.ok(mutex.totalHoldTime >= holdMs - 10);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

const scenarioEntries = Object.values(scenarioGroups).flat() as ScenarioCase[];

void describe('Mutex observability', () => {
  for (const scenario of scenarioEntries) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
