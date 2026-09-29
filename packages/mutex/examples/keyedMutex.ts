/** keyedMutex — reserve distinct ISBNs in parallel while serializing duplicate checkout clicks for one ISBN. Run: npx tsx examples/keyedMutex.ts */

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
      mutex.runExclusive('978-0-14-118776-1', () => {
        completionOrder.push('978-0-14-118776-1');
      }),
      mutex.runExclusive('978-0-06-112008-4', () => {
        completionOrder.push('978-0-06-112008-4');
      })
    ]);

    console.log('ISBN reservations completed in parallel:', completionOrder);
  }

  static async runSerialSameKey(): Promise<void> {
    // Concurrent calls on the SAME key must serialize
    let counter = 0;
    const results: number[] = [];

    await Promise.all([
      mutex.runExclusive('978-0-679-76489-8', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('978-0-679-76489-8', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      }),
      mutex.runExclusive('978-0-679-76489-8', () => {
        const snapshot = counter;
        counter++;
        results.push(snapshot);
      })
    ]);

    console.log('Duplicate checkout clicks serialized:', counter);
    console.log('Serialized results:', results.toSorted((a, b) => { const result = a - b; return result; }));
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
assert.ok(completionOrder.includes('978-0-14-118776-1'));
assert.ok(completionOrder.includes('978-0-06-112008-4'));

const finalStats = mutex.getStats();
assert.equal(finalStats.activeLocksCount, 0);
assert.equal(finalStats.queuedCount, 0);
assert.ok(finalStats.totalExecuted >= 5, `Expected at least 5 executions, got ${finalStats.totalExecuted}`);

console.log('keyedMutex: all assertions passed');
