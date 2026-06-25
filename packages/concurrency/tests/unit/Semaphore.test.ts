import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Semaphore } from '../../src/Semaphore.js';
import { SemaphoreError } from '../../src/errors/index.js';

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
  await Promise.resolve();

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
