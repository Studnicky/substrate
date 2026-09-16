/** Demonstrates independent per-key concurrency limits. */

import assert from 'node:assert/strict';

// #region usage
import { KeyedSemaphore } from '../src/index.js';

class KeyedSemaphoreDemo {
  static async run(): Promise<void> {
    const semaphore = KeyedSemaphore.create<string>({ 'maximumQueueSize': 1, 'permits': 1 });
    const releaseAccountA = await semaphore.acquire('account:a');
    const releaseAccountB = await semaphore.acquire('account:b');
    const waitingAccountA = semaphore.acquire('account:a');

    assert.equal(semaphore.activeCount(), 2);
    assert.equal(semaphore.queuedCount('account:a'), 1);

    await releaseAccountA();
    const releaseQueuedAccountA = await waitingAccountA;
    await releaseQueuedAccountA();
    await releaseAccountB();
    await semaphore.waitForIdle();

    assert.equal(semaphore.keyCount, 0);
  }
}
// #endregion usage

await KeyedSemaphoreDemo.run();
console.log('keyedSemaphore: independent keys and FIFO admission passed');
