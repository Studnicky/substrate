import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';
import { Semaphore } from '../../src/Semaphore.js';
import scenarioGroups from './Semaphore.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'reject-zero' | 'reject-fractional' | 'reject-negative'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'getter-reflects-permits'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'acquire-release-cycle'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'double-release-safe'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'queue-waiters'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'withPermit-runs'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'withPermit-throws'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'onAcquire-hooks'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'onAcquireWait-hooks'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'onAcquireWait-multiwaiter'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'onRelease-hooks'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'onReleaseDelegated-hooks'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'throwing-onAcquire'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'throwing-onContended'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'async-onAcquire-reject'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'async-onAcquire-reserve'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'async-onAcquireWait-reject'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'async-onContended-reject'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'fifo-swap'; name: string };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => { setImmediate(resolve); });
}

function semaphoreOptions(input: { semaphore: { permits: number } }): { permits: number } {
  return { 'permits': input.semaphore.permits };
}

class ObservedSemaphore extends Semaphore {
  readonly acquireEvents: number[] = [];
  readonly acquireWaitEvents: number[] = [];
  readonly contendedEvents: number[] = [];
  readonly releaseEvents: number[] = [];
  readonly releaseDelegatedEvents: number[] = [];
  constructor(options: { permits: number }) { super(options); }
  protected override onAcquire(permitsBefore: number): void { this.acquireEvents.push(permitsBefore); }
  protected override onAcquireWait(): void { this.acquireWaitEvents.push(1); }
  protected override onContended(queueLength: number): void { this.contendedEvents.push(queueLength); }
  protected override onRelease(permitsAfter: number): void { this.releaseEvents.push(permitsAfter); }
  protected override onReleaseDelegated(): void { this.releaseDelegatedEvents.push(1); }
}

const rejectInvalidPermits: ScenarioRunner = (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { errorName: string };
    assert.throws(() => Semaphore.create(semaphoreOptions(input)), { 'name': expected.errorName });
};

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'acquire-release-cycle': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfterAcquire1: number; availableAfterAcquire2: number; availableAfterRelease1: number; availableAfterRelease2: number; availableInitial: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    assert.equal(sem.available, expected.availableInitial);
    const r1 = await sem.acquire();
    assert.equal(sem.available, expected.availableAfterAcquire1);
    const r2 = await sem.acquire();
    assert.equal(sem.available, expected.availableAfterAcquire2);
    r1();
    assert.equal(sem.available, expected.availableAfterRelease1);
    r2();
    assert.equal(sem.available, expected.availableAfterRelease2);
  },
  'async-onAcquire-reject': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { hookName: string; unhandledRejections: number };
    class AsyncRejectingAcquireSemaphore extends Semaphore {
      protected override async onAcquire(): Promise<void> {
        await new Promise((resolve) => { setImmediate(resolve); });
        throw new Error(input.message);
      }
    }
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const sem = AsyncRejectingAcquireSemaphore.create(semaphoreOptions(input));
      await assert.rejects(() => sem.acquire(), { 'hookName': expected.hookName, 'name': HookInvocationError.name });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'async-onAcquire-reserve': async (scenarioCase) => {
    const input = scenarioCase.input as { firstMessage: string; secondMessage: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfterSecondRelease: number; availableAfterFirstFailure: number };
    class RejectFirstAcquireSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #acquireCount = 0;
      constructor() { super(semaphoreOptions(input)); }
      protected override async onAcquire(): Promise<void> {
        this.#acquireCount += 1;
        if (this.#acquireCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw new Error(input.firstMessage);
      }
    }
    const sem = new RejectFirstAcquireSemaphore();
    const first = sem.acquire();
    await sem.entered.promise;
    const second = sem.acquire();
    sem.finish.resolve();
    await assert.rejects(first, HookInvocationError);
    assert.equal(sem.available, expected.availableAfterFirstFailure);
    const releaseSecond = await second;
    assert.equal(sem.available, 0);
    await releaseSecond();
    assert.equal(sem.available, expected.availableAfterSecondRelease);
  },
  'async-onAcquireWait-reject': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfter: number; hookName: string; thirdAcquiredBeforeResolve: boolean };
    class RejectFirstWaitSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #waitCount = 0;
      constructor() { super(semaphoreOptions(input)); }
      protected override async onAcquireWait(): Promise<void> {
        this.#waitCount += 1;
        if (this.#waitCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw new Error(input.message);
      }
    }
    const sem = new RejectFirstWaitSemaphore();
    const releaseFirst = await sem.acquire();
    const second = sem.acquire();
    await sem.entered.promise;
    const secondRejected = assert.rejects(second, { 'hookName': expected.hookName, 'name': HookInvocationError.name });
    let thirdAcquired = false;
    const third = sem.acquire().then((release) => { thirdAcquired = true; return release; });
    await flushMicrotasks();
    await releaseFirst();
    assert.equal(thirdAcquired, expected.thirdAcquiredBeforeResolve);
    sem.finish.resolve();
    await secondRejected;
    const releaseThird = await third;
    assert.equal(thirdAcquired, true);
    assert.equal(sem.available, 0);
    await releaseThird();
    assert.equal(sem.available, expected.availableAfter);
  },
  'async-onContended-reject': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfter: number; hookName: string };
    class RejectFirstContendedSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #contendedCount = 0;
      constructor() { super(semaphoreOptions(input)); }
      protected override async onContended(): Promise<void> {
        this.#contendedCount += 1;
        if (this.#contendedCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw new Error(input.message);
      }
    }
    const sem = new RejectFirstContendedSemaphore();
    const releaseFirst = await sem.acquire();
    const second = sem.acquire();
    await sem.entered.promise;
    const secondRejected = assert.rejects(second, { 'hookName': expected.hookName, 'name': HookInvocationError.name });
    const third = sem.acquire();
    await releaseFirst();
    sem.finish.resolve();
    await secondRejected;
    const releaseThird = await third;
    assert.equal(sem.available, 0);
    await releaseThird();
    assert.equal(sem.available, expected.availableAfter);
  },
  'double-release-safe': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfterAcquire: number; availableAfterRelease: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    const release = await sem.acquire();
    assert.equal(sem.available, expected.availableAfterAcquire);
    release();
    release();
    assert.equal(sem.available, expected.availableAfterRelease);
  },
  'fifo-swap': async (scenarioCase) => {
    const input = scenarioCase.input as { order: number[]; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { order: number[]; availableAfter: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    const r1 = await sem.acquire();
    const order: number[] = [];
    const waiters = input.order.map((n) =>
      sem.acquire().then((release) => {
        order.push(n);
        return release;
      })
    );
    await flushMicrotasks();
    assert.deepEqual(order, []);
    await r1();
    const waiterTwo = waiters[0];
    assert.ok(waiterTwo);
    const releaseTwo = await waiterTwo;
    assert.deepEqual(order, expected.order.slice(0, 1));
    await releaseTwo();
    const waiterThree = waiters[1];
    assert.ok(waiterThree);
    const releaseThree = await waiterThree;
    assert.deepEqual(order, expected.order.slice(0, 2));
    await releaseThree();
    await waiters[2];
    assert.deepEqual(order, expected.order);
    assert.equal(sem.available, expected.availableAfter);
  },
  'getter-reflects-permits': (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { permits: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    assert.equal(sem.permits, expected.permits);
  },
  'onAcquire-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { acquireEvents: number[] };
    const sem = new ObservedSemaphore(semaphoreOptions(input));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, expected.acquireEvents.slice(0, 1));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, expected.acquireEvents);
  },
  'onAcquireWait-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { acquireWaitEvents: number; contendedEvents: number[] };
    const sem = new ObservedSemaphore(semaphoreOptions(input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await flushMicrotasks();
    assert.equal(sem.acquireWaitEvents.length, expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, expected.contendedEvents);
    r1();
    await pending;
  },
  'onAcquireWait-multiwaiter': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { acquireWaitEvents: number; contendedEvents: number[] };
    const sem = new ObservedSemaphore(semaphoreOptions(input));
    const r1 = await sem.acquire();
    const firstPending = sem.acquire();
    const secondPending = sem.acquire();
    await flushMicrotasks();
    assert.equal(sem.acquireWaitEvents.length, expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, expected.contendedEvents);
    r1();
    const r2 = await firstPending;
    r2();
    await secondPending;
  },
  'onRelease-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { releaseEvents: number[] };
    const sem = new ObservedSemaphore(semaphoreOptions(input));
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    r2();
    assert.deepEqual(sem.releaseEvents, expected.releaseEvents.slice(0, 1));
    r1();
    assert.deepEqual(sem.releaseEvents, expected.releaseEvents);
  },
  'onReleaseDelegated-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { releaseDelegatedEvents: number; releaseEvents: number };
    const sem = new ObservedSemaphore(semaphoreOptions(input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await Promise.resolve();
    r1();
    await pending;
    assert.equal(sem.releaseDelegatedEvents.length, expected.releaseDelegatedEvents);
    assert.equal(sem.releaseEvents.length, expected.releaseEvents);
  },
  'queue-waiters': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfterFirstRelease: number; availableAfterSecondRelease: number; secondAcquiredInitially: boolean };
    const sem = Semaphore.create(semaphoreOptions(input));
    const r1 = await sem.acquire();
    let secondAcquired = false;
    const pending = sem.acquire().then((r) => {
      secondAcquired = true;
      return r;
    });
    await Promise.resolve();
    assert.equal(secondAcquired, expected.secondAcquiredInitially);
    r1();
    const r2 = await pending;
    assert.equal(secondAcquired, true);
    assert.equal(sem.available, expected.availableAfterFirstRelease);
    r2();
    assert.equal(sem.available, expected.availableAfterSecondRelease);
  },
  'reject-fractional': rejectInvalidPermits,
  'reject-negative': rejectInvalidPermits,
  'reject-zero': rejectInvalidPermits,
  'throwing-onAcquire': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfter: number; hookName: string };
    class ThrowingAcquireSemaphore extends Semaphore {
      protected override onAcquire(): void {
        throw new Error(input.message);
      }
    }
    const sem = ThrowingAcquireSemaphore.create(semaphoreOptions(input));
    await assert.rejects(() => sem.acquire(), { 'hookName': expected.hookName, 'name': HookInvocationError.name });
    assert.equal(sem.available, expected.availableAfter);
  },
  'throwing-onContended': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfter: number; hookName: string };
    class ThrowingContendedSemaphore extends Semaphore {
      protected override onContended(): void {
        throw new Error(input.message);
      }
    }
    const sem = ThrowingContendedSemaphore.create(semaphoreOptions(input));
    const releaseFirst = await sem.acquire();
    const pendingSecond = sem.acquire();
    await assert.rejects(() => pendingSecond, { 'hookName': expected.hookName, 'name': HookInvocationError.name });
    await releaseFirst();
    assert.equal(sem.available, expected.availableAfter);
    const releaseThird = await sem.acquire();
    await releaseThird();
    assert.equal(sem.available, expected.availableAfter);
  },
  'withPermit-runs': async (scenarioCase) => {
    const input = scenarioCase.input as { semaphore: { permits: number } };
    const expected = scenarioCase.expected as { inside: boolean; availableAfter: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    let inside = false;
    await sem.withPermit(async () => {
      inside = true;
      assert.equal(sem.available, 0);
    });
    assert.equal(inside, expected.inside);
    assert.equal(sem.available, expected.availableAfter);
  },
  'withPermit-throws': async (scenarioCase) => {
    const input = scenarioCase.input as { message: string; semaphore: { permits: number } };
    const expected = scenarioCase.expected as { availableAfter: number };
    const sem = Semaphore.create(semaphoreOptions(input));
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- message is repo-authored fixture data, not attacker input
    await assert.rejects(() => sem.withPermit(async () => { throw new Error(input.message); }), new RegExp(input.message));
    assert.equal(sem.available, expected.availableAfter);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Semaphore', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
