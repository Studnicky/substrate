import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { HookInvocationError } from '@studnicky/errors';

import type { MutexConfigEntity } from '../../../src/entities/MutexConfigEntity.js';
import { LockTimeoutError } from '../../../src/errors/index.js';
import { Mutex } from '../../../src/mutex/index.js';
import scenarioGroups from './observability.scenarios.json';

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

type ScenarioKind =
  | 'afterAcquire-error-does-not-stop-queue'
  | 'afterAcquire-immediate'
  | 'afterAcquire-separate-keys'
  | 'afterAcquire-waiting'
  | 'afterRelease-fires'
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

type ScenarioCase = ScenarioData & { kind: ScenarioKind };
type ReleaseFunction = () => void;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

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

class HookErrorRecordingMutex extends Mutex<string> {
  protected override beforeAcquire(_key: string): void {
    throw new Error('beforeAcquire boom');
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
    throw new Error('Hook error');
  }

  protected override beforeRelease(_key: string, _holdTimeMs: number): void {
    throw new Error('Hook error');
  }
}

class ThrowingQueueMutex extends Mutex<string> {
  readonly acquireKeys: string[] = [];

  protected override afterAcquire(key: string, _waitTimeMs: number): void {
    this.acquireKeys.push(`acquired-${key}`);

    if (key === 'key1') {
      throw new Error('Hook error');
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
    throw new Error('beforeAcquire async boom');
  }

  protected override async afterAcquire(): Promise<void> {
    await Promise.resolve();
    throw new Error('afterAcquire async boom');
  }

  protected override async onContended(): Promise<void> {
    await Promise.resolve();
    throw new Error('onContended async boom');
  }

  protected override async beforeRelease(): Promise<void> {
    await Promise.resolve();
    throw new Error('beforeRelease async boom');
  }

  protected override async afterRelease(): Promise<void> {
    await Promise.resolve();
    throw new Error('afterRelease async boom');
  }

  protected override async onTimeout(): Promise<void> {
    await Promise.resolve();
    throw new Error('onTimeout async boom');
  }

  protected override async onAcquireWait(): Promise<void> {
    await Promise.resolve();
    throw new Error('onAcquireWait async boom');
  }

  protected override async onRelease(): Promise<void> {
    await Promise.resolve();
    throw new Error('onRelease async boom');
  }

  protected override async onQueueDrain(): Promise<void> {
    await Promise.resolve();
    throw new Error('onQueueDrain async boom');
  }

  protected override async onEnterKey(): Promise<void> {
    await Promise.resolve();
    throw new Error('onEnterKey async boom');
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
    throw new Error('Hook error');
  }
}

class ThrowingQueueDrainMutex extends Mutex<string> {
  protected override onQueueDrain(): void {
    throw new Error('Hook error');
  }
}

class ThrowingTimeoutHookMutex extends Mutex<string> {
  protected override onTimeout(): void {
    throw new Error('Hook error');
  }
}

function mutexConfig(scenarioCase: ScenarioCase): Partial<MutexConfigEntity.Type> {
  return (scenarioCase.input.mutex ?? {}) as Partial<MutexConfigEntity.Type>;
}

function readPendingCount(input: MutexScenarioInput): number {
  const value = input.batch?.pendingCount;
  if (typeof value !== 'number') {
    throw new Error('Scenario input.batch.pendingCount must be a number');
  }
  return value;
}

function readNumber(value: unknown, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function readStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return value;
}

function readNumberArray(value: unknown, label: string): number[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'number')) {
    throw new Error(`${label} must be a number array`);
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
    throw new Error(`${label} is missing item ${index}`);
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

const runnerMap: Record<ScenarioKind, ScenarioRunner> = {
  'afterAcquire-error-does-not-stop-queue': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new ThrowingQueueMutex();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.deepStrictEqual(mutex.acquireKeys, scenarioCase.expected.acquiredKeys);
  },
  'afterAcquire-immediate': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new AcquireTrackingMutex();
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
    const mutex = new AcquireTrackingMutex();
    const releases = await Promise.all(keys.map((key) => mutex.acquire(key)));
    assert.deepStrictEqual(mutex.acquireEvents.map((event) => event.key), scenarioCase.expected.acquireEvents);
    releaseAll(releases);
  },
  'afterAcquire-waiting': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new AcquireTrackingMutex();
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
    const mutex = new AfterReleaseTrackingMutex();
    const release = await mutex.acquire(key);
    release();
    assert.deepStrictEqual(mutex.afterReleaseEvents, scenarioCase.expected.afterReleaseEvents);
  },
  'async-hook-rejections-are-recorded': async (scenarioCase) => {
    const [queuedKey, timeoutKey] = readStringKeys(scenarioCase.input);
    const pendingCount = readPendingCount(scenarioCase.input);
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const mutex = new AsyncRejectingHooksMutex(mutexConfig(scenarioCase));
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
    const mutex = new HookErrorRecordingMutex();
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
    const mutex = new ReleaseTrackingMutex();
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
    const mutex = new ReleaseTrackingMutex();
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
    const mutex = new ThrowingMutex();
    const release = await mutex.acquire(key);
    assert.ok(mutex.isLocked(key));
    release();
    assert.strictEqual(!mutex.isLocked(key), scenarioCase.expected.released);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onAcquireWait-not-immediate': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new AcquireWaitTrackingMutex();
    const release = await mutex.acquire(key);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
    release();
  },
  'onAcquireWait-per-waiter': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new AcquireWaitTrackingMutex();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.acquireWaitEvents.length, scenarioCase.expected.acquireWaitCount);
  },
  'onAcquireWait-queued': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new AcquireWaitTrackingMutex();
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
    const mutex = new ContentionTrackingMutex();
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
    const mutex = new QueueDrainTrackingMutex();
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
    const mutex = new QueueDrainTrackingMutex();
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
    const mutex = new ThrowingQueueDrainMutex();
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    release();
    await releaseQueuedInOrder(pending);
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onQueueDrain-timeout': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new QueueDrainTrackingMutex(mutexConfig(scenarioCase));
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
    const mutex = new ReleaseHookTrackingMutex();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.onReleaseEvents.length, scenarioCase.expected.onReleaseCount);
    assert.strictEqual(mutex.onReleaseEvents[0], key);
  },
  'onRelease-handoff': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new ReleaseHookTrackingMutex();
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
    const mutex = new ThrowingReleaseHookMutex();
    const release = await mutex.acquire(key);
    release();
    assert.strictEqual(mutex.isLocked(key), scenarioCase.expected.lockedAfterRelease);
  },
  'onTimeout-fires': async (scenarioCase) => {
    const key = readStringKey(scenarioCase.input);
    const mutex = new TimeoutTrackingMutex(mutexConfig(scenarioCase));
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
    const mutex = new ThrowingTimeoutHookMutex(mutexConfig(scenarioCase));
    const release = await mutex.acquire(key);
    const pending = createAcquireBatch(readPendingCount(scenarioCase.input), () => mutex.acquire(key));
    for (const waiter of pending) {
      await assert.rejects(waiter, LockTimeoutError);
    }
    release();
  },
  'tracks-all-metrics': async (scenarioCase) => {
    const [firstKey, secondKey] = readStringKeys(scenarioCase.input);
    const holdMs = readNumber(scenarioCase.input.holdMs, 'Scenario input.holdMs');
    const mutex = new AllHooksMutex();
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
  await runnerMap[scenarioCase.kind](scenarioCase);
}

const scenarioEntries: ScenarioCase[] = Object.values(scenarioGroups).flat();

void describe('Mutex observability', () => {
  for (const scenario of scenarioEntries) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
