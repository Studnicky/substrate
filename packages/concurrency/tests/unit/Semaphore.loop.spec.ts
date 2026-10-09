import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { SemaphoreQueueFullError } from '../../src/errors/SemaphoreQueueFullError.js';
import { Semaphore } from '../../src/Semaphore.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import { EventLoop } from '../helpers/EventLoop.js';
import { SemaphoreScenarioCaseEntity } from './entities/SemaphoreScenarioCaseEntity.js';
import scenarioGroups from './Semaphore.scenarios.json' with { 'type': 'json' };

class ObservedSemaphore extends Semaphore {
  readonly acquireEvents: number[] = [];
  readonly acquireWaitEvents: number[] = [];
  readonly contendedEvents: number[] = [];
  readonly releaseEvents: number[] = [];
  readonly releaseDelegatedEvents: number[] = [];
  constructor(options: { 'permits': number }) { super(options); }
  protected override onAcquire(permitsBefore: number): void { this.acquireEvents.push(permitsBefore); }
  protected override onAcquireWait(): void { this.acquireWaitEvents.push(1); }
  protected override onContended(queueLength: number): void { this.contendedEvents.push(queueLength); }
  protected override onRelease(permitsAfter: number): void { this.releaseEvents.push(permitsAfter); }
  protected override onReleaseDelegated(): void { this.releaseDelegatedEvents.push(1); }
}

class AsyncRejectingAcquireSemaphore extends Semaphore {
  readonly #message: string;

  private constructor(permits: number, message: string) {
    super({ 'permits': permits });
    this.#message = message;
  }

  static make(permits: number, message: string): AsyncRejectingAcquireSemaphore {
    return new AsyncRejectingAcquireSemaphore(permits, message);
  }

  protected override async onAcquire(): Promise<void> {
    await new Promise((resolve) => { setImmediate(resolve); });
    throw RuntimeError.create(this.#message);
  }
}

class RejectFirstAcquireSemaphore extends Semaphore {
  readonly entered = Promise.withResolvers<void>();
  readonly finish = Promise.withResolvers<void>();
  readonly #message: string;
  #count = 0;

  private constructor(permits: number, message: string) {
    super({ 'permits': permits });
    this.#message = message;
  }

  static make(permits: number, message: string): RejectFirstAcquireSemaphore {
    return new RejectFirstAcquireSemaphore(permits, message);
  }

  protected override async onAcquire(): Promise<void> {
    this.#count += 1;
    if (this.#count === 1) {
      this.entered.resolve();
      await this.finish.promise;
      throw RuntimeError.create(this.#message);
    }
  }
}

class RejectFirstWaitSemaphore extends Semaphore {
  readonly entered = Promise.withResolvers<void>();
  readonly finish = Promise.withResolvers<void>();
  readonly #message: string;
  #count = 0;

  private constructor(permits: number, message: string) {
    super({ 'permits': permits });
    this.#message = message;
  }

  static make(permits: number, message: string): RejectFirstWaitSemaphore {
    return new RejectFirstWaitSemaphore(permits, message);
  }

  protected override async onAcquireWait(): Promise<void> {
    this.#count += 1;
    if (this.#count === 1) {
      this.entered.resolve();
      await this.finish.promise;
      throw RuntimeError.create(this.#message);
    }
  }
}

class RejectFirstContendedSemaphore extends Semaphore {
  readonly entered = Promise.withResolvers<void>();
  readonly finish = Promise.withResolvers<void>();
  readonly #message: string;
  #count = 0;

  private constructor(permits: number, message: string) {
    super({ 'permits': permits });
    this.#message = message;
  }

  static make(permits: number, message: string): RejectFirstContendedSemaphore {
    return new RejectFirstContendedSemaphore(permits, message);
  }

  protected override async onContended(): Promise<void> {
    this.#count += 1;
    if (this.#count === 1) {
      this.entered.resolve();
      await this.finish.promise;
      throw RuntimeError.create(this.#message);
    }
  }
}

class SuspendedFirstWaitSemaphore extends Semaphore {
  readonly resumeFirstWait = Promise.withResolvers<void>();
  readonly firstWaitEntered = Promise.withResolvers<void>();
  #count = 0;

  private constructor() {
    super({ 'permits': 1 });
  }

  static make(): SuspendedFirstWaitSemaphore {
    return new SuspendedFirstWaitSemaphore();
  }

  protected override async onAcquireWait(): Promise<void> {
    this.#count += 1;
    if (this.#count === 1) {
      this.firstWaitEntered.resolve();
      await this.resumeFirstWait.promise;
    }
  }
}

class SuspendedContentionSemaphore extends Semaphore {
  readonly resumeContention = Promise.withResolvers<void>();
  readonly contentionEntered = Promise.withResolvers<void>();
  #count = 0;

  private constructor() {
    super({ 'permits': 1 });
  }

  static make(): SuspendedContentionSemaphore {
    return new SuspendedContentionSemaphore();
  }

  protected override async onContended(): Promise<void> {
    this.#count += 1;
    if (this.#count === 1) {
      this.contentionEntered.resolve();
      await this.resumeContention.promise;
    }
  }
}

class SemaphoreRunners {
  static async 'acquire-release-cycle'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'acquire-release-cycle'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    assert.equal(sem.available, scenarioCase.expected.availableInitial);
    const r1 = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire1);
    const r2 = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire2);
    await r1();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease1);
    await r2();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease2);
  }

  static async 'async-onAcquire-reject'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'async-onAcquire-reject'>): Promise<void> {
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const sem = AsyncRejectingAcquireSemaphore.make(scenarioCase.input.semaphore.permits, scenarioCase.input.message);
      await assert.rejects(() => {
        const result = sem.acquire();
        return result;
      }, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, scenarioCase.expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'async-onAcquire-reserve'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'async-onAcquire-reserve'>): Promise<void> {
    const sem = RejectFirstAcquireSemaphore.make(scenarioCase.input.semaphore.permits, scenarioCase.input.firstMessage);
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
  }

  static async 'async-onAcquireWait-reject'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'async-onAcquireWait-reject'>): Promise<void> {
    const sem = RejectFirstWaitSemaphore.make(scenarioCase.input.semaphore.permits, scenarioCase.input.message);
    const releaseFirst = await sem.acquire();
    const second = sem.acquire();
    await sem.entered.promise;
    const secondRejected = assert.rejects(second, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    let thirdAcquired = false;
    const third = sem.acquire().then((release) => { thirdAcquired = true; return release; });
    await EventLoop.flush();
    await releaseFirst();
    assert.equal(thirdAcquired, scenarioCase.expected.thirdAcquiredBeforeResolve);
    sem.finish.resolve();
    await secondRejected;
    const releaseThird = await third;
    assert.equal(thirdAcquired, true);
    assert.equal(sem.available, 0);
    await releaseThird();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  static async 'async-onContended-reject'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'async-onContended-reject'>): Promise<void> {
    const sem = RejectFirstContendedSemaphore.make(scenarioCase.input.semaphore.permits, scenarioCase.input.message);
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
  }

  static async 'double-release-safe'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'double-release-safe'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const release = await sem.acquire();
    assert.equal(sem.available, scenarioCase.expected.availableAfterAcquire);
    await release();
    await release();
    assert.equal(sem.available, scenarioCase.expected.availableAfterRelease);
  }

  static async 'fifo-swap'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'fifo-swap'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const order: number[] = [];
    const waiters = scenarioCase.input.order.map((n) => {
      const waiter = SemaphoreRunners.queueWaiter(sem, order, n);
      return waiter;
    });
    await EventLoop.flush();
    assert.deepEqual(order, []);
    await r1();
    const waiterTwo = waiters[0];
    assert.ok(waiterTwo !== undefined);
    const releaseTwo = await waiterTwo;
    assert.deepEqual(order, scenarioCase.expected.order.slice(0, 1));
    await releaseTwo();
    const waiterThree = waiters[1];
    assert.ok(waiterThree !== undefined);
    const releaseThree = await waiterThree;
    assert.deepEqual(order, scenarioCase.expected.order.slice(0, 2));
    await releaseThree();
    await waiters[2];
    assert.deepEqual(order, scenarioCase.expected.order);
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  static 'getter-reflects-permits'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'getter-reflects-permits'>): void {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    assert.equal(sem.permits, scenarioCase.expected.permits);
  }

  static async 'onAcquire-hooks'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'onAcquire-hooks'>): Promise<void> {
    const sem = new ObservedSemaphore(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, scenarioCase.expected.acquireEvents.slice(0, 1));
    await sem.acquire();
    assert.deepEqual(sem.acquireEvents, scenarioCase.expected.acquireEvents);
  }

  static async 'onAcquireWait-hooks'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'onAcquireWait-hooks'>): Promise<void> {
    const sem = new ObservedSemaphore(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await EventLoop.flush();
    assert.equal(sem.acquireWaitEvents.length, scenarioCase.expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, scenarioCase.expected.contendedEvents);
    await r1();
    await pending;
  }

  static async 'onAcquireWait-multiwaiter'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'onAcquireWait-multiwaiter'>): Promise<void> {
    const sem = new ObservedSemaphore(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const firstPending = sem.acquire();
    const secondPending = sem.acquire();
    await EventLoop.flush();
    assert.equal(sem.acquireWaitEvents.length, scenarioCase.expected.acquireWaitEvents);
    assert.deepEqual(sem.contendedEvents, scenarioCase.expected.contendedEvents);
    await r1();
    const r2 = await firstPending;
    await r2();
    await secondPending;
  }

  static async 'onRelease-hooks'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'onRelease-hooks'>): Promise<void> {
    const sem = new ObservedSemaphore(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    await r2();
    assert.deepEqual(sem.releaseEvents, scenarioCase.expected.releaseEvents.slice(0, 1));
    await r1();
    assert.deepEqual(sem.releaseEvents, scenarioCase.expected.releaseEvents);
  }

  static async 'onReleaseDelegated-hooks'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'onReleaseDelegated-hooks'>): Promise<void> {
    const sem = new ObservedSemaphore(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    const pending = sem.acquire();
    await Promise.resolve();
    await r1();
    await pending;
    assert.equal(sem.releaseDelegatedEvents.length, scenarioCase.expected.releaseDelegatedEvents);
    assert.equal(sem.releaseEvents.length, scenarioCase.expected.releaseEvents);
  }

  static async 'queue-waiters'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'queue-waiters'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const r1 = await sem.acquire();
    let secondAcquired = false;
    const pending = sem.acquire().then((r) => {
      secondAcquired = true;
      return r;
    });
    await Promise.resolve();
    assert.equal(secondAcquired, scenarioCase.expected.secondAcquiredInitially);
    await r1();
    const r2 = await pending;
    assert.equal(secondAcquired, true);
    assert.equal(sem.available, scenarioCase.expected.availableAfterFirstRelease);
    await r2();
    assert.equal(sem.available, scenarioCase.expected.availableAfterSecondRelease);
  }

  static 'reject-fractional'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-fractional'>): void {
    SemaphoreRunners.rejectInvalidPermits(scenarioCase);
  }

  static 'reject-negative'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-negative'>): void {
    SemaphoreRunners.rejectInvalidPermits(scenarioCase);
  }

  static 'reject-zero'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-zero'>): void {
    SemaphoreRunners.rejectInvalidPermits(scenarioCase);
  }

  static async 'throwing-onAcquire'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'throwing-onAcquire'>): Promise<void> {
    class ThrowingAcquireSemaphore extends Semaphore {
      protected override onAcquire(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = ThrowingAcquireSemaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    await assert.rejects(() => {
      const result = sem.acquire();
      return result;
    }, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  static async 'throwing-onContended'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'throwing-onContended'>): Promise<void> {
    class ThrowingContendedSemaphore extends Semaphore {
      protected override onContended(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }
    const sem = ThrowingContendedSemaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const releaseFirst = await sem.acquire();
    const pendingSecond = sem.acquire();
    await assert.rejects(() => {return pendingSecond;}, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
    await releaseFirst();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
    const releaseThird = await sem.acquire();
    await releaseThird();
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  static async 'withPermit-runs'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'withPermit-runs'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    let inside = false;
    await sem.withPermit(async () => {
      inside = true;
      assert.equal(sem.available, 0);
      await Promise.resolve();
    });
    assert.equal(inside, scenarioCase.expected.inside);
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  static async 'withPermit-throws'(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'withPermit-throws'>): Promise<void> {
    const sem = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
    const error = await ErrorCapture.rejection(sem.withPermit(async () => { return await Promise.reject(RuntimeError.create(scenarioCase.input.message)); }));
    assert.ok(error.message.includes(scenarioCase.input.message));
    assert.equal(sem.available, scenarioCase.expected.availableAfter);
  }

  private static async queueWaiter(sem: Semaphore, order: number[], value: number): Promise<() => Promise<void>> {
    const release = await sem.acquire();
    order.push(value);
    return release;
  }

  private static semaphoreOptions(input: { 'semaphore': { 'permits': number } }): { 'permits': number } {
    return { 'permits': input.semaphore.permits };
  }

  private static rejectInvalidPermits(scenarioCase: ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-fractional'> | ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-negative'> | ScenarioCaseOfType<SemaphoreScenarioCaseEntity.Type, 'reject-zero'>): void {
    assert.throws(() => {
      const result = Semaphore.create(SemaphoreRunners.semaphoreOptions(scenarioCase.input));
      return result;
    }, { 'name': scenarioCase.expected.errorName });
  }
}

class SemaphoreCapacityTests {
  static declaresCapacityTests(): void {
    void it('grows capacity, grants queued work, and reports exact counts', async () => {
      const semaphore = Semaphore.create({ 'permits': 1 });
      const releaseFirst = await semaphore.acquire();
      const pending = semaphore.acquire();
      await EventLoop.flush();

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
      await EventLoop.flush();

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
      await EventLoop.flush();

      assert.equal(semaphore.queuedCount, 1);
      controller.abort(RuntimeError.create('waiter cancelled'));
      await assert.rejects(pending);
      assert.equal(semaphore.queuedCount, 0);

      await release();
      await semaphore.waitForIdle();
    });
  }

  static declaresCancellationTests(): void {
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

    void it('refuses a full queue without changing its admission state', async () => {
      const semaphore = Semaphore.create({ 'maximumQueueSize': 1, 'permits': 1 });
      const releaseFirst = await semaphore.acquire();
      const pending = semaphore.acquire();
      await EventLoop.flush();

      await assert.rejects(() => {
        const result = semaphore.acquire();
        return result;
      }, SemaphoreQueueFullError);
      assert.equal(semaphore.activeCount, 1);
      assert.equal(semaphore.queuedCount, 1);

      await releaseFirst();
      const releaseSecond = await pending;
      await releaseSecond();
    });

    void it('unlinks an aborted middle waiter before admitting a replacement', async () => {
      const semaphore = Semaphore.create({ 'maximumQueueSize': 2, 'permits': 1 });
      const releaseFirst = await semaphore.acquire();
      const releaseSecond = semaphore.acquire();
      const controller = new AbortController();
      const abortedThird = semaphore.acquire({ 'signal': controller.signal });
      await EventLoop.flush();

      controller.abort(RuntimeError.create('waiter cancelled'));
      await assert.rejects(abortedThird);
      assert.equal(semaphore.queuedCount, 1);

      const releaseFourth = semaphore.acquire();
      await EventLoop.flush();
      assert.equal(semaphore.queuedCount, 2);

      await releaseFirst();
      const releaseSecondPermit = await releaseSecond;
      await releaseSecondPermit();
      const releaseFourthPermit = await releaseFourth;
      await releaseFourthPermit();
      await semaphore.waitForIdle();
    });

    void it('cancels a suspended head waiter and immediately grants a ready follower when capacity exists', async () => {

      const semaphore = SuspendedFirstWaitSemaphore.make();
      const releaseHolder = await semaphore.acquire();
      const controller = new AbortController();
      const cancelled = semaphore.acquire({ 'signal': controller.signal });
      await semaphore.firstWaitEntered.promise;
      const follower = semaphore.acquire();
      await EventLoop.flush();
      await semaphore.setPermits(2);

      const cancelledCapture = ErrorCapture.rejection(cancelled);
      controller.abort(RuntimeError.create('waiter cancelled'));
      const cancelledError = await cancelledCapture;
      assert.ok(cancelledError.message.includes('aborted'));
      const releaseFollower = await follower;

      assert.equal(semaphore.activeCount, 2);
      assert.equal(semaphore.queuedCount, 0);
      await releaseFollower();
      await releaseHolder();
      semaphore.resumeFirstWait.resolve();
      await semaphore.waitForIdle();
    });

    void it('cancels a waiter suspended in its contention hook without blocking ready followers', async () => {

      const semaphore = SuspendedContentionSemaphore.make();
      const releaseHolder = await semaphore.acquire();
      const controller = new AbortController();
      const cancelled = semaphore.acquire({ 'signal': controller.signal });
      await semaphore.contentionEntered.promise;
      const follower = semaphore.acquire();
      await EventLoop.flush();
      await semaphore.setPermits(2);

      controller.abort(RuntimeError.create('waiter cancelled'));
      const cancelledError = await ErrorCapture.rejection(cancelled);
      assert.ok(cancelledError.message.includes('aborted'));
      const releaseFollower = await follower;

      assert.equal(semaphore.activeCount, 2);
      assert.equal(semaphore.queuedCount, 0);
      await releaseFollower();
      await releaseHolder();
      semaphore.resumeContention.resolve();
      await semaphore.waitForIdle();
    });
  }
}

void describe('Semaphore capacity coordination', () => {
  SemaphoreCapacityTests.declaresCapacityTests();
  SemaphoreCapacityTests.declaresCancellationTests();
});

ScenarioSuite.register({
  'entity': SemaphoreScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Semaphore',
  'runners': SemaphoreRunners
});
