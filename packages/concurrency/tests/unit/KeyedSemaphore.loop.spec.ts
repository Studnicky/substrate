import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KeyedSemaphore, SemaphoreQueueFullError } from '../../src/index.js';

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

void describe('KeyedSemaphore', () => {
  void it('isolates permit capacity and queue state by key', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'maximumQueueSize': 1, 'permits': 1 });
    const releaseAlpha = await semaphore.acquire('alpha');
    const releaseBeta = await semaphore.acquire('beta');
    const pendingAlpha = semaphore.acquire('alpha');
    await flushMicrotasks();

    assert.equal(semaphore.activeCount(), 2);
    assert.equal(semaphore.activeCount('alpha'), 1);
    assert.equal(semaphore.activeCount('beta'), 1);
    assert.equal(semaphore.queuedCount(), 1);
    assert.equal(semaphore.queuedCount('alpha'), 1);
    assert.equal(semaphore.queuedCount('beta'), 0);
    await assert.rejects(() => semaphore.acquire('alpha'), SemaphoreQueueFullError);

    await releaseAlpha();
    const releaseQueuedAlpha = await pendingAlpha;
    await releaseQueuedAlpha();
    await releaseBeta();

    assert.equal(semaphore.activeCount(), 0);
    assert.equal(semaphore.queuedCount(), 0);
    assert.equal(semaphore.activeCount('alpha'), 0);
    assert.equal(semaphore.queuedCount('beta'), 0);
  });

  void it('waits for an individual key without waiting for other keys', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'permits': 1 });
    const releaseAlpha = await semaphore.acquire('alpha');
    const releaseBeta = await semaphore.acquire('beta');
    const alphaIdle = semaphore.waitForIdle('alpha');
    let alphaSettled = false;
    const observedAlphaIdle = alphaIdle.then(() => {
      alphaSettled = true;
    });

    await releaseAlpha();
    await observedAlphaIdle;
    assert.equal(alphaSettled, true);
    assert.equal(semaphore.activeCount('beta'), 1);

    await releaseBeta();
    await semaphore.waitForIdle();
    assert.equal(semaphore.activeCount(), 0);
  });

  void it('releases keyed permits when a callback throws', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'permits': 1 });

    await assert.rejects(async () => semaphore.withPermit('invoice:42', async () => {
      throw new Error('operation failed');
    }), /operation failed/);

    await semaphore.waitForIdle('invoice:42');
    assert.equal(semaphore.activeCount(), 0);
    assert.equal(semaphore.queuedCount(), 0);
  });

  void it('cancels a middle waiter without disturbing FIFO order and reuses the reclaimed key', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'permits': 1 });
    const releaseHolder = await semaphore.acquire('tenant:17');
    const releaseMiddle = new AbortController();
    const first = semaphore.acquire('tenant:17');
    const middle = semaphore.acquire('tenant:17', { 'signal': releaseMiddle.signal });
    let lastGranted = false;
    const last = semaphore.acquire('tenant:17').then((release) => {
      lastGranted = true;
      return release;
    });

    await flushMicrotasks();
    assert.equal(semaphore.keyCount, 1);
    assert.equal(semaphore.activeCount('tenant:17'), 1);
    assert.equal(semaphore.queuedCount('tenant:17'), 3);

    releaseMiddle.abort();
    await assert.rejects(middle, /aborted/);
    assert.equal(semaphore.queuedCount('tenant:17'), 2);

    await releaseHolder();
    const releaseFirst = await first;
    assert.equal(lastGranted, false);
    assert.equal(semaphore.activeCount('tenant:17'), 1);
    assert.equal(semaphore.queuedCount('tenant:17'), 1);

    await releaseFirst();
    const releaseLast = await last;
    assert.equal(lastGranted, true);
    await releaseLast();

    assert.equal(semaphore.activeCount('tenant:17'), 0);
    assert.equal(semaphore.queuedCount('tenant:17'), 0);
    assert.equal(semaphore.keyCount, 0);

    const releaseReused = await semaphore.acquire('tenant:17');
    assert.equal(semaphore.keyCount, 1);
    await releaseReused();
    assert.equal(semaphore.keyCount, 0);
  });

  void it("removes an idle key pool and keeps a keyed release idempotent", async () => {
    const semaphore = KeyedSemaphore.create<string>({ "permits": 1 });
    const release = await semaphore.acquire("account:7");

    assert.equal(semaphore.keyCount, 1);
    await release();
    await release();
    await semaphore.waitForIdle();

    assert.equal(semaphore.keyCount, 0);
    assert.equal(semaphore.activeCount(), 0);
    assert.equal(semaphore.queuedCount(), 0);
  });
});
