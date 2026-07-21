import { it } from 'node:test';
import assert from 'node:assert/strict';
import { HookInvocationError } from '@studnicky/errors';
import { Semaphore } from '../../src/Semaphore.js';
import { SemaphoreError } from '../../src/errors/index.js';

/** Flushes every pending microtask (unlike a single `await Promise.resolve()`), for asserting on state set inside awaited hook chains. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => { setImmediate(resolve); });
}

const errorScenarios: Array<{ description: string; input: number }> = [
  { description: 'rejects zero permits', input: 0 },
  { description: 'rejects fractional permits', input: 1.5 },
  { description: 'rejects negative permits', input: -1 },
];
for (const { description, input } of errorScenarios) {
  it(description, () => {
    assert.throws(() => Semaphore.create({ 'permits': input }), SemaphoreError);
  });
}

const getterScenarios: Array<{ description: string; permits: number }> = [
  { description: 'permits getter reflects constructor value', permits: 3 },
];
for (const { description, permits } of getterScenarios) {
  it(description, () => {
    const sem = Semaphore.create({ permits });
    assert.equal(sem.permits, permits);
  });
}

it('acquire and release cycle decrements and restores available', async () => {
  const sem = Semaphore.create({ 'permits': 2 });
  assert.equal(sem.available, 2);

  const r1 = await sem.acquire();
  assert.equal(sem.available, 1);

  const r2 = await sem.acquire();
  assert.equal(sem.available, 0);

  r1();
  assert.equal(sem.available, 1);

  r2();
  assert.equal(sem.available, 2);
});

it('double-release is safe (idempotent)', async () => {
  const sem = Semaphore.create({ 'permits': 1 });
  const release = await sem.acquire();
  assert.equal(sem.available, 0);

  release();
  release(); // second call must be a no-op
  assert.equal(sem.available, 1);
});

it('queues waiters when all permits are taken', async () => {
  const sem = Semaphore.create({ 'permits': 1 });
  const r1 = await sem.acquire();

  let secondAcquired = false;
  const pending = sem.acquire().then((r) => {
    secondAcquired = true;
    return r;
  });

  // Yield so the promise can progress — it should not have fired yet.
  await Promise.resolve();
  assert.equal(secondAcquired, false);

  r1(); // release → queued waiter fires

  const r2 = await pending;
  assert.equal(secondAcquired, true);
  assert.equal(sem.available, 0);

  r2();
  assert.equal(sem.available, 1);
});

it('withPermit runs callback under permit and releases on return', async () => {
  const sem = Semaphore.create({ 'permits': 1 });
  let inside = false;

  await sem.withPermit(async () => {
    inside = true;
    assert.equal(sem.available, 0);
  });

  assert.equal(inside, true);
  assert.equal(sem.available, 1);
});

it('withPermit releases permit even when callback throws', async () => {
  const sem = Semaphore.create({ 'permits': 1 });

  await assert.rejects(
    () => sem.withPermit(async () => { throw new Error('boom'); }),
    /boom/
  );

  assert.equal(sem.available, 1);
});

// Hook observation tests
class ObservedSemaphore extends Semaphore {
  readonly acquireEvents: number[] = [];
  readonly acquireWaitEvents: number[] = [];
  readonly contendedEvents: number[] = [];
  readonly releaseEvents: number[] = [];
  readonly releaseDelegatedEvents: number[] = [];

  constructor(permits: number) { super({ 'permits': permits }); }

  protected override onAcquire(permitsBefore: number): void {
    this.acquireEvents.push(permitsBefore);
  }
  protected override onAcquireWait(): void {
    this.acquireWaitEvents.push(1);
  }
  protected override onContended(queueLength: number): void {
    this.contendedEvents.push(queueLength);
  }
  protected override onRelease(permitsAfter: number): void {
    this.releaseEvents.push(permitsAfter);
  }
  protected override onReleaseDelegated(): void {
    this.releaseDelegatedEvents.push(1);
  }
}

it('onAcquire fires with correct permitsBefore when permit available immediately', async () => {
  const sem = new ObservedSemaphore(2);
  await sem.acquire();
  assert.deepEqual(sem.acquireEvents, [2]);
  await sem.acquire();
  assert.deepEqual(sem.acquireEvents, [2, 1]);
});

it('onAcquireWait and onContended fire when all permits taken', async () => {
  const sem = new ObservedSemaphore(1);
  const r1 = await sem.acquire();

  const pending = sem.acquire();
  await flushMicrotasks();

  assert.equal(sem.acquireWaitEvents.length, 1);
  assert.deepEqual(sem.contendedEvents, [1]);

  r1();
  await pending;
});

it('onRelease fires with correct permitsAfter on normal release', async () => {
  const sem = new ObservedSemaphore(2);
  const r1 = await sem.acquire();
  const r2 = await sem.acquire();
  r2();
  assert.deepEqual(sem.releaseEvents, [1]);
  r1();
  assert.deepEqual(sem.releaseEvents, [1, 2]);
});

it('onReleaseDelegated fires when queued waiter gets the permit', async () => {
  const sem = new ObservedSemaphore(1);
  const r1 = await sem.acquire();

  const pending = sem.acquire();
  await Promise.resolve();

  r1();
  await pending;

  assert.equal(sem.releaseDelegatedEvents.length, 1);
  assert.equal(sem.releaseEvents.length, 0);
});

it('a throwing onAcquire hook rejects acquire() with HookInvocationError', async () => {
  class ThrowingAcquireSemaphore extends Semaphore {
    protected override onAcquire(): void {
      throw new Error('hook boom');
    }
  }

  const sem = ThrowingAcquireSemaphore.create({ 'permits': 1 });
  await assert.rejects(() => sem.acquire(), HookInvocationError);
  assert.equal(sem.available, 1);
});

it('a throwing onContended hook rejects the waiting acquire() with HookInvocationError', async () => {
  class ThrowingContendedSemaphore extends Semaphore {
    protected override onContended(): void {
      throw new Error('hook boom');
    }
  }

  const sem = ThrowingContendedSemaphore.create({ 'permits': 1 });
  const releaseFirst = await sem.acquire();

  const pendingSecond = sem.acquire();
  await assert.rejects(() => pendingSecond, HookInvocationError);

  await releaseFirst();
  assert.equal(sem.available, 1);

  const releaseThird = await sem.acquire();
  await releaseThird();
  assert.equal(sem.available, 1);
});

it('an async-overridden onAcquire hook that rejects is routed safely through HookInvoker without an unhandled rejection', async () => {
  class AsyncRejectingAcquireSemaphore extends Semaphore {
    protected override async onAcquire(): Promise<void> {
      await new Promise((resolve) => { setImmediate(resolve); });
      throw new Error('async hook boom');
    }
  }

  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    const sem = AsyncRejectingAcquireSemaphore.create({ 'permits': 1 });
    await assert.rejects(() => sem.acquire(), HookInvocationError);

    await new Promise((resolve) => { setImmediate(resolve); });
    assert.equal(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('an async onAcquire rejection restores its reserved permit and grants the next queued caller', async () => {
  class RejectFirstAcquireSemaphore extends Semaphore {
    readonly entered = Promise.withResolvers<void>();
    readonly finish = Promise.withResolvers<void>();
    #acquireCount = 0;

    constructor() {
      super({ 'permits': 1 });
    }

    protected override async onAcquire(): Promise<void> {
      this.#acquireCount += 1;
      if (this.#acquireCount !== 1) { return; }
      this.entered.resolve();
      await this.finish.promise;
      throw new Error('first acquire hook failed');
    }
  }

  const sem = new RejectFirstAcquireSemaphore();
  const first = sem.acquire();
  await sem.entered.promise;

  const second = sem.acquire();
  sem.finish.resolve();

  await assert.rejects(first, HookInvocationError);
  const releaseSecond = await second;
  assert.equal(sem.available, 0);

  await releaseSecond();
  assert.equal(sem.available, 1);
});

it('an async onAcquireWait rejection cancels the head waiter without letting a later waiter bypass FIFO', async () => {
  class RejectFirstWaitSemaphore extends Semaphore {
    readonly entered = Promise.withResolvers<void>();
    readonly finish = Promise.withResolvers<void>();
    #waitCount = 0;

    constructor() {
      super({ 'permits': 1 });
    }

    protected override async onAcquireWait(): Promise<void> {
      this.#waitCount += 1;
      if (this.#waitCount !== 1) { return; }
      this.entered.resolve();
      await this.finish.promise;
      throw new Error('wait hook failed');
    }
  }

  const sem = new RejectFirstWaitSemaphore();
  const releaseFirst = await sem.acquire();
  const second = sem.acquire();
  await sem.entered.promise;
  const secondRejected = assert.rejects(second, HookInvocationError);

  let thirdAcquired = false;
  const third = sem.acquire().then((release) => {
    thirdAcquired = true;
    return release;
  });
  await flushMicrotasks();
  await releaseFirst();
  assert.equal(thirdAcquired, false);

  sem.finish.resolve();
  await secondRejected;
  const releaseThird = await third;
  assert.equal(thirdAcquired, true);
  assert.equal(sem.available, 0);

  await releaseThird();
  assert.equal(sem.available, 1);
});

it('an async onContended rejection cancels the head waiter and transfers the released permit to the next waiter', async () => {
  class RejectFirstContendedSemaphore extends Semaphore {
    readonly entered = Promise.withResolvers<void>();
    readonly finish = Promise.withResolvers<void>();
    #contendedCount = 0;

    constructor() {
      super({ 'permits': 1 });
    }

    protected override async onContended(): Promise<void> {
      this.#contendedCount += 1;
      if (this.#contendedCount !== 1) { return; }
      this.entered.resolve();
      await this.finish.promise;
      throw new Error('contended hook failed');
    }
  }

  const sem = new RejectFirstContendedSemaphore();
  const releaseFirst = await sem.acquire();
  const second = sem.acquire();
  await sem.entered.promise;
  const secondRejected = assert.rejects(second, HookInvocationError);

  const third = sem.acquire();
  await releaseFirst();
  sem.finish.resolve();

  await secondRejected;
  const releaseThird = await third;
  assert.equal(sem.available, 0);

  await releaseThird();
  assert.equal(sem.available, 1);
});

it('FIFO order survives the CircularBuffer swap: queued acquirers are granted permits in arrival order', async () => {
  const sem = Semaphore.create({ 'permits': 1 });
  const r1 = await sem.acquire();

  const order: number[] = [];
  const waiters = [1, 2, 3].map((n) =>
    sem.acquire().then((release) => {
      order.push(n);
      return release;
    })
  );

  await flushMicrotasks();
  assert.deepEqual(order, []);

  await r1();
  const releaseTwo = await waiters[0];
  assert.deepEqual(order, [1]);

  await releaseTwo();
  const releaseThree = await waiters[1];
  assert.deepEqual(order, [1, 2]);

  await releaseThree();
  await waiters[2];
  assert.deepEqual(order, [1, 2, 3]);
});
