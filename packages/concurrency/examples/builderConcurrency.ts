/** builderConcurrency — constructs a Semaphore via Semaphore.builder() and a Channel via Channel.builder(), both exercised with visible output. Run: npx tsx examples/builderConcurrency.ts */

import assert from 'node:assert/strict';

// #region usage
import { Channel, Semaphore } from '../src/index.js';

// --- Semaphore via builder ---
const sem = Semaphore.builder()
  .withPermits(2)
  .build();

console.log('Semaphore built. Permits:', sem.permits, 'Available:', sem.available);

let maxConcurrent = 0;
let inFlight = 0;
const completions: number[] = [];

class Task {
  static async run(id: number): Promise<void> {
    const result = sem.withPermit(async () => {
      inFlight += 1;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      // Yield to the microtask queue so tasks interleave
      await Promise.resolve();
      inFlight -= 1;
      completions.push(id);
    });
    return await result;
  }
}

// 4 concurrent tasks against a 2-permit semaphore — max concurrent stays at or below 2
await Promise.all([Task.run(1), Task.run(2), Task.run(3), Task.run(4)]);
console.log('Max concurrent (≤2):', maxConcurrent);
console.log('Completions:', completions);

// --- Channel via builder ---
const channel = Channel.builder<string>().build();

console.log('\nChannel built. Publishing items...');
channel.publish('notifications', 'signup');
channel.publish('notifications', 'payment');
channel.publish('notifications', 'logout');
channel.close();

const received: string[] = [];
for await (const item of channel.subscribe('notifications')) {
  received.push(item);
}
console.log('Channel received:', received);
// #endregion usage

assert.ok(maxConcurrent <= 2, `maxConcurrent ${maxConcurrent} exceeded permits`);
assert.equal(completions.length, 4, 'All 4 tasks completed');
assert.deepEqual(received, ['signup', 'payment', 'logout'], 'Channel delivered all items in order');

console.log('builderConcurrency: all assertions passed');
