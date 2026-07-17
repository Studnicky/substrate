/** builderConcurrency — constructs a Semaphore via Semaphore.builder() and a Channel via Channel.builder(), both exercised with visible output. Run: npx tsx examples/builderConcurrency.ts */

import assert from 'node:assert/strict';

// #region usage
import { Channel, Semaphore } from '../src/index.js';

class Task {
  static readonly completions: number[] = [];
  static maxConcurrent = 0;
  static #inFlight = 0;

  static async run(id: number, sem: Semaphore): Promise<void> {
    const result = sem.withPermit(async () => {
      Task.#inFlight += 1;
      Task.maxConcurrent = Math.max(Task.maxConcurrent, Task.#inFlight);
      // Yield to the microtask queue so tasks interleave
      await Promise.resolve();
      Task.#inFlight -= 1;
      Task.completions.push(id);
    });
    return await result;
  }
}

class BuilderConcurrencyDemo {
  static async runSemaphore(): Promise<void> {
    // --- Semaphore via builder ---
    const sem = Semaphore.builder()
      .withPermits(2)
      .build();

    console.log('Semaphore built. Permits:', sem.permits, 'Available:', sem.available);

    // 4 concurrent tasks against a 2-permit semaphore — max concurrent stays at or below 2
    await Promise.all([Task.run(1, sem), Task.run(2, sem), Task.run(3, sem), Task.run(4, sem)]);
    console.log('Max concurrent (≤2):', Task.maxConcurrent);
    console.log('Completions:', Task.completions);

    assert.ok(Task.maxConcurrent <= 2, `maxConcurrent ${Task.maxConcurrent} exceeded permits`);
    assert.equal(Task.completions.length, 4, 'All 4 tasks completed');
  }

  static async runChannel(): Promise<void> {
    // --- Channel via builder ---
    const channel = Channel.builder<string>().build();

    console.log('\nChannel built. Publishing items...');
    await channel.publish('notifications', 'signup');
    await channel.publish('notifications', 'payment');
    await channel.publish('notifications', 'logout');
    await channel.close();

    const received: string[] = [];
    for await (const item of channel.subscribe('notifications')) {
      received.push(item);
    }
    console.log('Channel received:', received);
    assert.deepEqual(received, ['signup', 'payment', 'logout'], 'Channel delivered all items in order');
  }
}
// #endregion usage

await BuilderConcurrencyDemo.runSemaphore();
await BuilderConcurrencyDemo.runChannel();

console.log('builderConcurrency: all assertions passed');
