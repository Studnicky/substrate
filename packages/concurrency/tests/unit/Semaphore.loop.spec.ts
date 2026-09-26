import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Semaphore } from '../../src/Semaphore.js';
import { SemaphoreQueueFullError } from '../../src/errors/SemaphoreQueueFullError.js';
import { SemaphoreScenarioCaseEntity } from './entities/SemaphoreScenarioCaseEntity.js';
import scenarioGroups from './Semaphore.scenarios.json' with { type: 'json' };

type ScenarioCase = SemaphoreScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

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

function rejectInvalidPermits(scenarioCase: Extract<ScenarioCase, { shape: 'reject-fractional' | 'reject-negative' | 'reject-zero' }>): void {
  assert.throws(() => Semaphore.create(semaphoreOptions(scenarioCase.input)), { 'name': scenarioCase.expected.errorName });
}

const runnerMap: RunnerMap = {
  'acquire-release-cycle': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    assert.equal(sem.available, scenarioCase.expected.availableInitial);
    const r1 = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire1);
    const r2 = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire2);
    r1();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease1);
    r2();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease2);
  },
  'async-onAcquire-reject': async (scenarioCase) => {
    class AsyncRejectingAcquireSemaphore extends Semaphore {
      protected override async onAcquire(): Promise<void> {
        await new Promise((resolve) => { setImmediate(resolve); });
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const sem = AsyncRejectingAcquireSemaphore.create(semaphoreOptions(scenarioCase.input));
      await assert.rejects(() => sem.acquire(), { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, scenarioCase.expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'async-onAcquire-reserve': async (scenarioCase) => {
    class RejectFirstAcquireSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #acquireCount = 0;
      constructor() { super(semaphoreOptions(scenarioCase.input)); }
      protected override async onAcquire(): Promise<void> {
        this.#acquireCount += 1;
        if (this.#acquireCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw RuntimeError.create(scenarioCase.input.firstMessage);
      }
    }
    const sem = new RejectFirstAcquireSemaphore();
    const first = sem.acquire();
    await sem.entered.promise;
    const second = sem.acquire();
    sem.finish.resolve();
    await assert.rejects(first, HookInvocationError);
    assert.equal(sem.available, scenarioCase.expected.availableAfterFirstFailure);
    const releaseSecond = await second;
    assert.equal(sem.available, 0);
    await releaseSecond();
    assert.equal(sem.available, scenarioCase.expected.availableAfterSecondRelease);
  },
  'async-onAcquireWait-reject': async (scenarioCase) => {
    class RejectFirstWaitSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #waitCount = 0;
      constructor() { super(semaphoreOptions(scenarioCase.input)); }
      protected override async onAcquireWait(): Promise<void> {
        this.#waitCount += 1;
        if (this.#waitCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = new RejectFirstWaitSemaphore();
    const releaseFirst = await sem.acquire();
    const second = sem.acquire();
    await sem.entered.promise;
    const secondRejected = assert.rejects(second, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    let thirdAcquired = false;
    const third = sem.acquire().then((release) => { thirdAcquired = true; return release; });
    await flushMicrotasks();
    await releaseFirst();
    assert.equal(thirdAcquired, scenarioCase.expected.thirdAcquiredBeforeResolve);
    sem.finish.resolve();
    await secondRejected;
    const releaseThird = await third;
    assert.equal(thirdAcquired, true);
    assert.equal(sem.available, 0);
    await releaseThird();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'async-onContended-reject': async (scenarioCase) => {
    class RejectFirstContendedSemaphore extends Semaphore {
      readonly entered = Promise.withResolvers<void>();
      readonly finish = Promise.withResolvers<void>();
      #contendedCount = 0;
      constructor() { super(semaphoreOptions(scenarioCase.input)); }
      protected override async onContended(): Promise<void> {
        this.#contendedCount += 1;
        if (this.#contendedCount !== 1) { return; }
        this.entered.resolve();
        await this.finish.promise;
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = new RejectFirstContendedSemaphore();
    const releaseFirst = await sem.acquire();
    const second = sem.acquire();
    await sem.entered.promise;
    const secondRejected = assert.rejects(second, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    const third = sem.acquire();
    await releaseFirst();
    sem.finish.resolve();
    await secondRejected;
    const releaseThird = await third;
    assert.equal(sem.available, 0);
    await releaseThird();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'double-release-safe': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    const release = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire);
    release();
    release();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease);
  },
  'fifo-swap': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const order: number[] = [];
    const waiters = scenarioCase.input.order.map((n) =>
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
    assert.deepEqual(order, scenarioCase.expected.order.slice(0, 1));
    await releaseTwo();
    const waiterThree = waiters[1];
    assert.ok(waiterThree);
    const releaseThree = await waiterThree;
    assert.deepEqual(order, scenarioCase.expected.order.slice(0, 2));
    await releaseThree();
    await waiters[2];
    assert.deepEqual(order, scenarioCase.expected.order);
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'getter-reflects-permits': (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    assert.equal(sem.permits, scenarioCase.expected.permits);
  },
  'onAcquire-hooks': async (scenarioCase) => {
    const sem = new ObservedSemaphore(semaphoreOptions(scenarioCase.input));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, scenarioCase.expected.acquireEvents.slice(0, 1));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, scenarioCase.expected.acquireEvents);
  },
  'onAcquireWait-hooks': async (scenarioCase) => {
    const sem = new ObservedSemaphore(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await flushMicrotasks();
    assert.equal(sem.acquireWaitEvents.length, scenarioCase.expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, scenarioCase.expected.contendedEvents);
    r1();
    await pending;
  },
  'onAcquireWait-multiwaiter': async (scenarioCase) => {
    const sem = new ObservedSemaphore(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const firstPending = sem.acquire();
    const secondPending = sem.acquire();
    await flushMicrotasks();
    assert.equal(sem.acquireWaitEvents.length, scenarioCase.expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, scenarioCase.expected.contendedEvents);
    r1();
    const r2 = await firstPending;
    r2();
    await secondPending;
  },
  'onRelease-hooks': async (scenarioCase) => {
    const sem = new ObservedSemaphore(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    r2();
    assert.deepEqual(sem.releaseEvents, scenarioCase.expected.releaseEvents.slice(0, 1));
    r1();
    assert.deepEqual(sem.releaseEvents, scenarioCase.expected.releaseEvents);
  },
  'onReleaseDelegated-hooks': async (scenarioCase) => {
    const sem = new ObservedSemaphore(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await Promise.resolve();
    r1();
    await pending;
    assert.equal(sem.releaseDelegatedEvents.length, scenarioCase.expected.releaseDelegatedEvents);
    assert.equal(sem.releaseEvents.length, scenarioCase.expected.releaseEvents);
  },
  'queue-waiters': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    let secondAcquired = false;
    const pending = sem.acquire().then((r) => {
      secondAcquired = true;
      return r;
    });
    await Promise.resolve();
    assert.equal(secondAcquired, scenarioCase.expected.secondAcquiredInitially);
    r1();
    const r2 = await pending;
    assert.equal(secondAcquired, true);
    assert.equal(sem.available, scenarioCase.expected.availableAfterFirstRelease);
    r2();
    assert.equal(sem.available, scenarioCase.expected.availableAfterSecondRelease);
  },
  'reject-fractional': rejectInvalidPermits,
  'reject-negative': rejectInvalidPermits,
  'reject-zero': rejectInvalidPermits,
  'throwing-onAcquire': async (scenarioCase) => {
    class ThrowingAcquireSemaphore extends Semaphore {
      protected override onAcquire(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = ThrowingAcquireSemaphore.create(semaphoreOptions(scenarioCase.input));
    await assert.rejects(() => sem.acquire(), { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'throwing-onContended': async (scenarioCase) => {
    class ThrowingContendedSemaphore extends Semaphore {
      protected override onContended(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = ThrowingContendedSemaphore.create(semaphoreOptions(scenarioCase.input));
    const releaseFirst = await sem.acquire();
    const pendingSecond = sem.acquire();
    await assert.rejects(() => pendingSecond, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    await releaseFirst();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
    const releaseThird = await sem.acquire();
    await releaseThird();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'withPermit-runs': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    let inside = false;
    await sem.withPermit(async () => {
      inside = true;
      assert.equal(sem.available, 0);
    });
    assert.equal(inside, scenarioCase.expected.inside);
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  },
  'withPermit-throws': async (scenarioCase) => {
    const sem = Semaphore.create(semaphoreOptions(scenarioCase.input));
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- message is repo-authored fixture data, not attacker input
    await assert.rejects(() => sem.withPermit(async () => { throw RuntimeError.create(scenarioCase.input.message); }), new RegExp(scenarioCase.input.message));
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }
};

async function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(SemaphoreScenarioCaseEntity.Schema, SemaphoreScenarioCaseEntity.Node);

void describe('Semaphore', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});


void describe('Semaphore capacity coordination', () => {
  void it('grows capacity, grants queued work, and reports exact counts', async () => {
    const semaphore = Semaphore.create({ 'permits': 1 });
    const releaseFirst = await semaphore.acquire();
    const pending = semaphore.acquire();
    await flushMicrotasks();

    assert.equal(semaphore.activeCount, 1);
    assert.equal(semaphore.queuedCount, 1);

    await semaphore.setPermits(2);
    const releaseSecond = await pending;

    assert.equal(semaphore.permits, 2);
    assert.equal(semaphore.activeCount, 2);
    assert.equal(semaphore.queuedCount, 0);

    await releaseFirst();
    await releaseSecond();
    assert.equal(semaphore.activeCount, 0);
    assert.equal(semaphore.available, 2);
  });

  void it('shrinks capacity without revoking active work and waits for idle', async () => {
    const semaphore = Semaphore.create({ 'permits': 2 });
    const releaseFirst = await semaphore.acquire();
    const releaseSecond = await semaphore.acquire();
    const pending = semaphore.acquire();
    await flushMicrotasks();

    await semaphore.setPermits(1);
    let idle = false;
    const idleWaiter = semaphore.waitForIdle().then(() => { idle = true; });

    assert.equal(semaphore.available, -1);
    await releaseFirst();
    assert.equal(semaphore.available, 0);
    await releaseSecond();
    const releaseThird = await pending;
    assert.equal(semaphore.activeCount, 1);
    assert.equal(idle, false);

    await releaseThird();
    await idleWaiter;
    assert.equal(idle, true);
    assert.equal(semaphore.available, 1);
  });

  void it('removes an aborted waiter from the reported queue depth', async () => {
    const semaphore = Semaphore.create({ 'permits': 1 });
    const release = await semaphore.acquire();
    const controller = new AbortController();
    const pending = semaphore.acquire({ 'signal': controller.signal });
    await flushMicrotasks();

    assert.equal(semaphore.queuedCount, 1);
    controller.abort();
    await assert.rejects(pending);
    assert.equal(semaphore.queuedCount, 0);

    await release();
    await semaphore.waitForIdle();
  });

  void it('settles idle waiters when a release hook fails', async () => {
    class ThrowingReleaseSemaphore extends Semaphore {
      protected override onRelease(): void {
        throw RuntimeError.create('release hook failed');
      }
    }

    const semaphore = ThrowingReleaseSemaphore.create({ 'permits': 1 });
    const release = await semaphore.acquire();
    const idle = semaphore.waitForIdle();

    await assert.rejects(release, HookInvocationError);
    await idle;
    assert.equal(semaphore.activeCount, 0);
    assert.equal(semaphore.queuedCount, 0);
  });

  void it("refuses a full queue without changing its admission state", async () => {
    const semaphore = Semaphore.create({ "maximumQueueSize": 1, "permits": 1 });
    const releaseFirst = await semaphore.acquire();
    const pending = semaphore.acquire();
    await flushMicrotasks();

    await assert.rejects(() => semaphore.acquire(), SemaphoreQueueFullError);
    assert.equal(semaphore.activeCount, 1);
    assert.equal(semaphore.queuedCount, 1);

    await releaseFirst();
    const releaseSecond = await pending;
    await releaseSecond();
  });

  void it("unlinks an aborted middle waiter before admitting a replacement", async () => {
    const semaphore = Semaphore.create({ "maximumQueueSize": 2, "permits": 1 });
    const releaseFirst = await semaphore.acquire();
    const releaseSecond = semaphore.acquire();
    const controller = new AbortController();
    const abortedThird = semaphore.acquire({ "signal": controller.signal });
    await flushMicrotasks();

    controller.abort();
    await assert.rejects(abortedThird);
    assert.equal(semaphore.queuedCount, 1);

    const releaseFourth = semaphore.acquire();
    await flushMicrotasks();
    assert.equal(semaphore.queuedCount, 2);

    await releaseFirst();
    const releaseSecondPermit = await releaseSecond;
    await releaseSecondPermit();
    const releaseFourthPermit = await releaseFourth;
    await releaseFourthPermit();
    await semaphore.waitForIdle();
  });
  void it("cancels a suspended head waiter and immediately grants a ready follower when capacity exists", async () => {
    class SuspendedFirstWaitSemaphore extends Semaphore {
      readonly resumeFirstWait = Promise.withResolvers<void>();
      readonly firstWaitEntered = Promise.withResolvers<void>();
      #waitCount = 0;

      constructor() {
        super({ "permits": 1 });
      }

      protected override async onAcquireWait(): Promise<void> {
        this.#waitCount += 1;
        if (this.#waitCount === 1) {
          this.firstWaitEntered.resolve();
          await this.resumeFirstWait.promise;
        }
      }
    }

    const semaphore = new SuspendedFirstWaitSemaphore();
    const releaseHolder = await semaphore.acquire();
    const controller = new AbortController();
    const cancelled = semaphore.acquire({ "signal": controller.signal });
    await semaphore.firstWaitEntered.promise;
    const follower = semaphore.acquire();
    await flushMicrotasks();
    await semaphore.setPermits(2);

    const cancelledAssertion = assert.rejects(cancelled, /aborted/);
    controller.abort();
    await cancelledAssertion;
    const releaseFollower = await follower;

    assert.equal(semaphore.activeCount, 2);
    assert.equal(semaphore.queuedCount, 0);
    await releaseFollower();
    await releaseHolder();
    semaphore.resumeFirstWait.resolve();
    await semaphore.waitForIdle();
  });

  void it("cancels a waiter suspended in its contention hook without blocking ready followers", async () => {
    class SuspendedContentionSemaphore extends Semaphore {
      readonly contentionEntered = Promise.withResolvers<void>();
      readonly resumeContention = Promise.withResolvers<void>();
      #contentionCount = 0;

      constructor() {
        super({ "permits": 1 });
      }

      protected override async onContended(): Promise<void> {
        this.#contentionCount += 1;
        if (this.#contentionCount === 1) {
          this.contentionEntered.resolve();
          await this.resumeContention.promise;
        }
      }
    }

    const semaphore = new SuspendedContentionSemaphore();
    const releaseHolder = await semaphore.acquire();
    const controller = new AbortController();
    const cancelled = semaphore.acquire({ "signal": controller.signal });
    await semaphore.contentionEntered.promise;
    const follower = semaphore.acquire();
    await flushMicrotasks();
    await semaphore.setPermits(2);

    controller.abort();
    await assert.rejects(cancelled, /aborted/);
    const releaseFollower = await follower;

    assert.equal(semaphore.activeCount, 2);
    assert.equal(semaphore.queuedCount, 0);
    await releaseFollower();
    await releaseHolder();
    semaphore.resumeContention.resolve();
    await semaphore.waitForIdle();
  });
});
