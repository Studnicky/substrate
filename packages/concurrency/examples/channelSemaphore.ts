/** channelSemaphore — demonstrates Channel producer/consumer and Semaphore permit gating. Run: npx tsx examples/channelSemaphore.ts */

import assert from 'node:assert/strict';

// #region usage
import { Channel, Semaphore } from '../src/index.js';

class ChannelSemaphoreDemo {
  static async runChannel(): Promise<number[]> {
    const channel = Channel.create<number>();

    // Publish items before subscribing — they buffer in the channel
    channel.publish('nums', 1);
    channel.publish('nums', 2);
    channel.publish('nums', 3);
    channel.close();

    const received: number[] = [];
    for await (const item of channel.subscribe('nums')) {
      received.push(item);
    }

    console.log('Channel received:', received);
    return received;
  }

  static async runChannelMultiKey(): Promise<{ 'a': string[]; 'b': string[] }> {
    const channel = Channel.create<string>();

    // Two independent keys — no cross-talk
    channel.publish('a', 'alpha');
    channel.publish('b', 'beta');
    channel.publish('a', 'apple');
    channel.close();

    const fromA: string[] = [];
    for await (const item of channel.subscribe('a')) {
      fromA.push(item);
    }

    const fromB: string[] = [];
    for await (const item of channel.subscribe('b')) {
      fromB.push(item);
    }

    console.log('Channel key=a:', fromA);
    console.log('Channel key=b:', fromB);
    return { 'a': fromA, 'b': fromB };
  }

  static async runChannelConcurrent(): Promise<number[]> {
    const channel = Channel.create<number>();
    const received: number[] = [];

    // Start subscriber before publishing — it will wait for items
    const consuming = (async () => {
      for await (const item of channel.subscribe('live')) {
        received.push(item);
      }
    })();

    // Publish asynchronously, then close
    await Promise.resolve();
    channel.publish('live', 10);
    channel.publish('live', 20);
    channel.close();

    await consuming;

    console.log('Channel concurrent received:', received);
    return received;
  }

  static async runSemaphoreWithPermit(): Promise<number> {
    const sem = Semaphore.create({ 'permits': 2 });

    console.log('Semaphore permits:', sem.permits, 'available:', sem.available);

    let concurrent = 0;
    let maxConcurrent = 0;

    const task = (): Promise<void> =>
    { const result = sem.withPermit(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      // Yield to the event loop so tasks interleave
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      concurrent -= 1;
    }); return result; };

    // Launch 4 tasks against a semaphore of 2
    await Promise.all([task(), task(), task(), task()]);

    console.log('Semaphore maxConcurrent:', maxConcurrent, '(≤ 2), available after:', sem.available);
    return maxConcurrent;
  }

  static async runSemaphoreAcquireRelease(): Promise<{ 'afterAcquire': number; 'afterRelease': number }> {
    const sem = Semaphore.create({ 'permits': 1 });

    const release = await sem.acquire();
    const afterAcquire = sem.available;
    console.log('Semaphore available after acquire:', afterAcquire);

    release();
    const afterRelease = sem.available;
    console.log('Semaphore available after release:', afterRelease);
    return { 'afterAcquire': afterAcquire, 'afterRelease': afterRelease };
  }
}
// #endregion usage

const channelResult = await ChannelSemaphoreDemo.runChannel();
assert.deepEqual(channelResult, [1, 2, 3]);

const multiKeyResult = await ChannelSemaphoreDemo.runChannelMultiKey();
assert.deepEqual(multiKeyResult.a, ['alpha', 'apple']);
assert.deepEqual(multiKeyResult.b, ['beta']);

const concurrentResult = await ChannelSemaphoreDemo.runChannelConcurrent();
assert.deepEqual(concurrentResult, [10, 20]);

const maxConcurrent = await ChannelSemaphoreDemo.runSemaphoreWithPermit();
assert.ok(maxConcurrent <= 2, `maxConcurrent ${maxConcurrent} exceeded permits`);

const semResult = await ChannelSemaphoreDemo.runSemaphoreAcquireRelease();
assert.equal(semResult.afterAcquire, 0);
assert.equal(semResult.afterRelease, 1);

console.log('channelSemaphore: all assertions passed');
