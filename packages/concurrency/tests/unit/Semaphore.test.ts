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
