/** acquireRelease — demonstrates acquire() with manual try/finally release, isLocked(), and queueSize(). Run: npx tsx examples/acquireRelease.ts */

import assert from 'node:assert/strict';

// #region usage
import { Mutex } from '../src/index.js';

const mutex = Mutex.create<string>();

class AcquireReleaseDemo {
  static async runManualRelease(): Promise<void> {
    const release = await mutex.acquire('resource');

    // Queue a second waiter without awaiting — it will sit in the queue
    let secondAcquired = false;
    const secondPromise = mutex.acquire('resource').then((rel) => {
      secondAcquired = true;
      rel();
    });

    // The second waiter is in the queue
    console.log('Queue size while locked:', mutex.queueSize('resource'));

    try {
      // Critical section — 'resource' is exclusively held here
      console.log('Is locked:', mutex.isLocked('resource'));
    } finally {
      release();
    }

    // Wait for the queued waiter to complete
    await secondPromise;

    console.log('Second acquired:', secondAcquired);
    console.log('Is locked after all released:', mutex.isLocked('resource'));
    console.log('Queue size after completion:', mutex.queueSize('resource'));
  }

  static async runDisposable(): Promise<void> {
    // acquireDisposable — manual release via .release()
    const lock = await mutex.acquireDisposable('disposable');

    console.log('Lock key:', lock.key);
    console.log('Is locked (disposable):', mutex.isLocked('disposable'));

    lock.release();

    console.log('Is locked after release:', mutex.isLocked('disposable'));
  }
}

await AcquireReleaseDemo.runManualRelease();
await AcquireReleaseDemo.runDisposable();
// #endregion usage

assert.equal(mutex.isLocked('resource'), false);
assert.equal(mutex.queueSize('resource'), 0);
assert.equal(mutex.isLocked('disposable'), false);

console.log('acquireRelease: all assertions passed');
