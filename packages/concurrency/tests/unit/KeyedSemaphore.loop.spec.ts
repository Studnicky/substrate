import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KeyedSemaphore, SemaphoreQueueFullError } from '../../src/index.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import { EventLoop } from '../helpers/EventLoop.js';

void describe('KeyedSemaphore', () => {
  void it('isolates permit capacity and queue state by key', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'maximumQueueSize': 1, 'permits': 1 });
    const releaseAlpha = await semaphore.acquire('alpha');
    const releaseBeta = await semaphore.acquire('beta');
    const pendingAlpha = semaphore.acquire('alpha');
    await EventLoop.flush();

    assert.equal(semaphore.activeCount(), 2);
    assert.equal(semaphore.activeCount('alpha'), 1);
    assert.equal(semaphore.activeCount('beta'), 1);
    assert.equal(semaphore.queuedCount(), 1);
    assert.equal(semaphore.queuedCount('alpha'), 1);
    assert.equal(semaphore.queuedCount('beta'), 0);
    const queueFullError = await ErrorCapture.rejection(semaphore.acquire('alpha'));
    assert.ok(queueFullError instanceof SemaphoreQueueFullError);

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

    const failure = await ErrorCapture.rejection(semaphore.withPermit('invoice:42', async () => {
      return await Promise.reject(RuntimeError.create('operation failed'));
    }));
    assert.ok(failure.message.includes('operation failed'));

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

    await EventLoop.flush();
    assert.equal(semaphore.keyCount, 1);
    assert.equal(semaphore.activeCount('tenant:17'), 1);
    assert.equal(semaphore.queuedCount('tenant:17'), 3);

    releaseMiddle.abort(RuntimeError.create('middle waiter cancelled'));
    const abortError = await ErrorCapture.rejection(middle);
    assert.ok(abortError.message.includes('aborted'));
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

  void it('removes an idle key pool and keeps a keyed release idempotent', async () => {
    const semaphore = KeyedSemaphore.create<string>({ 'permits': 1 });
    const release = await semaphore.acquire('account:7');

    assert.equal(semaphore.keyCount, 1);
    await release();
    await release();
    await semaphore.waitForIdle();

    assert.equal(semaphore.keyCount, 0);
    assert.equal(semaphore.activeCount(), 0);
    assert.equal(semaphore.queuedCount(), 0);
  });
});
