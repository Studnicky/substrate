/** acquireRelease — demonstrates acquire() with manual try/finally release, isLocked(), and queueSize(). Run: npx tsx examples/acquireRelease.ts */

import assert from 'node:assert/strict';

import { Mutex } from '../src/index.js';

const mutex = Mutex.create<string>();

class AcquireReleaseDemo {
  static async runManualRelease(): Promise<void> {
    // Not locked before acquisition
    assert.equal(mutex.isLocked('resource'), false);

    const release = await mutex.acquire('resource');

    // Locked immediately after acquire
    assert.equal(mutex.isLocked('resource'), true);

    // Queue a second waiter without awaiting — it will sit in the queue
    let secondAcquired = false;
    const secondPromise = mutex.acquire('resource').then((rel) => {
      secondAcquired = true;
      rel();
    });

    // The second waiter is in the queue
    assert.equal(mutex.queueSize('resource'), 1);

    try {
      // Critical section — 'resource' is exclusively held here
      assert.equal(mutex.isLocked('resource'), true);
    } finally {
      release();
    }

    // Wait for the queued waiter to complete
    await secondPromise;

    assert.ok(secondAcquired, 'Second acquire should have completed after release');
    assert.equal(mutex.isLocked('resource'), false);
    assert.equal(mutex.queueSize('resource'), 0);
  }

  static async runDisposable(): Promise<void> {
    // acquireDisposable — manual release via .release()
    const lock = await mutex.acquireDisposable('disposable');

    assert.equal(mutex.isLocked('disposable'), true);
    assert.equal(lock.key, 'disposable');

    lock.release();

    assert.equal(mutex.isLocked('disposable'), false);
  }
}

await AcquireReleaseDemo.runManualRelease();
await AcquireReleaseDemo.runDisposable();

console.log('acquireRelease example passed.');
