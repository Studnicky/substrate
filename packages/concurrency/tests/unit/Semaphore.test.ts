import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Semaphore } from '../../src/Semaphore.js';

describe('Semaphore', () => {
  it('rejects non-integer permits', () => {
    assert.throws(() => new Semaphore(0), RangeError);
    assert.throws(() => new Semaphore(1.5), RangeError);
    assert.throws(() => new Semaphore(-1), RangeError);
  });

  it('acquire and release cycle decrements and restores available', async () => {
    const sem = new Semaphore(2);
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
    const sem = new Semaphore(1);
    const release = await sem.acquire();
    assert.equal(sem.available, 0);

    release();
    release(); // second call must be a no-op
    assert.equal(sem.available, 1);
  });

  it('queues waiters when all permits are taken', async () => {
    const sem = new Semaphore(1);
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
    const sem = new Semaphore(1);
    let inside = false;

    await sem.withPermit(async () => {
      inside = true;
      assert.equal(sem.available, 0);
    });

    assert.equal(inside, true);
    assert.equal(sem.available, 1);
  });

  it('withPermit releases permit even when callback throws', async () => {
    const sem = new Semaphore(1);

    await assert.rejects(
      () => sem.withPermit(async () => { throw new Error('boom'); }),
      /boom/
    );

    assert.equal(sem.available, 1);
  });

  it('permits getter reflects constructor value', () => {
    const sem = new Semaphore(3);
    assert.equal(sem.permits, 3);
  });
});
