/** keyedMutex — demonstrates key-based parallelism vs serialization. Run: npx tsx examples/keyedMutex.ts */

import assert from 'node:assert/strict';

// #region usage
import { Mutex } from '../src/index.js';

const mutex = Mutex.create<string>();

// Different keys run concurrently — track completion order
const completionOrder: string[] = [];

class KeyedMutexDemo {
  static async runParallelKeys(): Promise<void> {
    // Two concurrent runExclusive calls on DIFFERENT keys should both start immediately
    await Promise.all([
      mutex.runExclusive('keyA', () => {
        completionOrder.push('keyA');
      }),
      mutex.runExclusive('keyB', () => {
        completionOrder.push('keyB');
      })
    ]);

    console.log('Completion order (parallel keys):', completionOrder);
  }

  static async runSerialSameKey(): Promise<void> {
    // Concurrent calls on the SAME key must serialize
    let counter = 0;
    const results: number[] = [];

    await Promise.all([
      mutex.runExclusive('shared', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('shared', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('shared', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      })
    ]);

    console.log('Serialized counter:', counter);
    console.log('Serialized results:', results.sort((a, b) => { return a - b; }));
  }

  static showStats(): void {
    const stats = mutex.getStats();
    console.log('Stats:', stats);
  }
}

await KeyedMutexDemo.runParallelKeys();
await KeyedMutexDemo.runSerialSameKey();
KeyedMutexDemo.showStats();
// #endregion usage

assert.equal(completionOrder.length, 2);
assert.ok(completionOrder.includes('keyA'));
assert.ok(completionOrder.includes('keyB'));

const finalStats = mutex.getStats();
assert.equal(finalStats.activeLocksCount, 0);
assert.equal(finalStats.queuedCount, 0);
assert.ok(finalStats.totalExecuted >= 5, `Expected at least 5 executions, got ${finalStats.totalExecuted}`);

console.log('keyedMutex: all assertions passed');
