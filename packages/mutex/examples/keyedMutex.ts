/** keyedMutex — demonstrates key-based parallelism vs serialization. Run: npx tsx examples/keyedMutex.ts */

import assert from 'node:assert/strict';

import { Mutex } from '../src/index.js';

const mutex = Mutex.create<string>();

// Different keys run concurrently — track completion order
const completionOrder: string[] = [];

class KeyedMutexDemo {
  static async runParallelKeys(): Promise<void> {
    // Two concurrent runExclusive calls on DIFFERENT keys should both start immediately
    await Promise.all([
      mutex.runExclusive('keyA', async () => {
        completionOrder.push('keyA');
      }),
      mutex.runExclusive('keyB', async () => {
        completionOrder.push('keyB');
      }),
    ]);

    // Both completed — order may vary but both must be present
    assert.equal(completionOrder.length, 2);
    assert.ok(completionOrder.includes('keyA'));
    assert.ok(completionOrder.includes('keyB'));
  }

  static async runSerialSameKey(): Promise<void> {
    // Concurrent calls on the SAME key must serialize
    let counter = 0;
    const results: number[] = [];

    await Promise.all([
      mutex.runExclusive('shared', async () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('shared', async () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('shared', async () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
    ]);

    // Serialized increments: each operation saw a unique snapshot (0, 1, 2)
    assert.equal(counter, 3);
    assert.deepEqual(results.sort((a, b) => a - b), [0, 1, 2]);
  }

  static async showStats(): Promise<void> {
    const stats = mutex.getStats();
    assert.equal(stats.activeLocksCount, 0);
    assert.equal(stats.queuedCount, 0);
    assert.ok(stats.totalExecuted >= 5, `Expected at least 5 executions, got ${stats.totalExecuted}`);
  }
}

await KeyedMutexDemo.runParallelKeys();
await KeyedMutexDemo.runSerialSameKey();
await KeyedMutexDemo.showStats();

const finalStats = mutex.getStats();
console.log('Stats:', finalStats);
console.log('keyedMutex example passed.');
