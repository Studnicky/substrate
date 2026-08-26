/** channelSemaphore — demonstrates Channel producer/consumer and Semaphore permit gating. Run: npx tsx examples/channelSemaphore.ts */

import assert from 'node:assert/strict';

// #region usage
import { Channel, Semaphore } from '../src/index.js';

class ChannelSemaphoreDemo {
  static async runChannel(): Promise<void> {
    const channel = Channel.create<number>();

    // Publish items before subscribing — they buffer in the channel
    await channel.publish('nums', 1);
    await channel.publish('nums', 2);
    await channel.publish('nums', 3);
    await channel.close();

    const received = await Array.fromAsync(channel.subscribe('nums'));

    console.log('Channel received:', received);
    assert.deepEqual(received, [1, 2, 3]);
  }

  static async runChannelMultiKey(): Promise<void> {
    const channel = Channel.create<string>();

    // Two independent keys — no cross-talk
    await channel.publish('a', 'alpha');
    await channel.publish('b', 'beta');
    await channel.publish('a', 'apple');
    await channel.close();

    const fromA = await Array.fromAsync(channel.subscribe('a'));

    const fromB = await Array.fromAsync(channel.subscribe('b'));

    console.log('Channel key=a:', fromA);
    console.log('Channel key=b:', fromB);
    assert.deepEqual(fromA, ['alpha', 'apple']);
    assert.deepEqual(fromB, ['beta']);
  }

  static async runChannelConcurrent(): Promise<void> {
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
    await channel.publish('live', 10);
    await channel.publish('live', 20);
    await channel.close();

    await consuming;

    console.log('Channel concurrent received:', received);
    assert.deepEqual(received, [10, 20]);
  }

  static async runSemaphoreWithPermit(): Promise<void> {
    const sem = Semaphore.create({ 'permits': 2 });

    console.log('Semaphore permits:', sem.permits, 'available:', sem.available);

    let concurrent = 0;
    let maximumConcurrent = 0;

    const runTask = async (): Promise<void> => {
      concurrent += 1;
      maximumConcurrent = Math.max(maximumConcurrent, concurrent);
      // Yield to the event loop so tasks interleave
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      concurrent -= 1;
    };

    // Launch 4 tasks against a semaphore of 2
    await Promise.all([
      sem.withPermit(runTask),
      sem.withPermit(runTask),
      sem.withPermit(runTask),
      sem.withPermit(runTask)
    ]);

    console.log('Semaphore maximum concurrent:', maximumConcurrent, '(≤ 2), available after:', sem.available);
    assert.ok(maximumConcurrent <= 2, `maximum concurrent ${maximumConcurrent} exceeded permits`);
  }

  static async runSemaphoreAcquireRelease(): Promise<void> {
    const sem = Semaphore.create({ 'permits': 1 });

    const release = await sem.acquire();
    const afterAcquire = sem.available;
    console.log('Semaphore available after acquire:', afterAcquire);

    await release();
    const afterRelease = sem.available;
    console.log('Semaphore available after release:', afterRelease);
    assert.equal(afterAcquire, 0);
    assert.equal(afterRelease, 1);
  }
}
// #endregion usage

await ChannelSemaphoreDemo.runChannel();
await ChannelSemaphoreDemo.runChannelMultiKey();
await ChannelSemaphoreDemo.runChannelConcurrent();
await ChannelSemaphoreDemo.runSemaphoreWithPermit();
await ChannelSemaphoreDemo.runSemaphoreAcquireRelease();

console.log('channelSemaphore: all assertions passed');
