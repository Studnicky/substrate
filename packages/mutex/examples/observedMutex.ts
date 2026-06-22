/** observedMutex — demonstrates subclassing Mutex to observe afterAcquire and beforeRelease hooks. Run: npx tsx examples/observedMutex.ts */

import assert from 'node:assert/strict';

import { Mutex } from '../src/index.js';

interface HookRecordInterface {
  holdTimeMs: number;
  key: string;
  waitTimeMs: number;
}

class ObservedMutex extends Mutex<string> {
  readonly acquireRecords: HookRecordInterface[] = [];
  readonly releaseRecords: Pick<HookRecordInterface, 'holdTimeMs' | 'key'>[] = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    this.acquireRecords.push({ holdTimeMs: 0, key, waitTimeMs });
  }

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    this.releaseRecords.push({ holdTimeMs, key });
  }
}

class ObservedMutexDemo {
  static async run(): Promise<void> {
    const mutex = new ObservedMutex();

    // Run two exclusive operations on different keys
    await Promise.all([
      mutex.runExclusive('alpha', async () => {
        // simulate minimal work with a resolved promise
        await Promise.resolve();
      }),
      mutex.runExclusive('beta', async () => {
        await Promise.resolve();
      }),
    ]);

    // Run a sequential operation on the same key to exercise queueing
    await mutex.runExclusive('alpha', async () => {
      await Promise.resolve();
    });

    // afterAcquire fired for each operation
    assert.equal(mutex.acquireRecords.length, 3, `Expected 3 acquireRecords, got ${mutex.acquireRecords.length}`);

    // beforeRelease fired for each operation
    assert.equal(mutex.releaseRecords.length, 3, `Expected 3 releaseRecords, got ${mutex.releaseRecords.length}`);

    // All records have numeric wait/hold times
    for (const record of mutex.acquireRecords) {
      assert.ok(typeof record.waitTimeMs === 'number', 'waitTimeMs must be a number');
      assert.ok(record.waitTimeMs >= 0, 'waitTimeMs must be non-negative');
      assert.ok(typeof record.key === 'string', 'key must be a string');
    }

    for (const record of mutex.releaseRecords) {
      assert.ok(typeof record.holdTimeMs === 'number', 'holdTimeMs must be a number');
      assert.ok(record.holdTimeMs >= 0, 'holdTimeMs must be non-negative');
    }

    // Keys recorded match what we locked
    const acquiredKeys = mutex.acquireRecords.map((r) => r.key).sort();
    assert.deepEqual(acquiredKeys, ['alpha', 'alpha', 'beta']);

    console.log('Acquire records:', mutex.acquireRecords);
    console.log('Release records:', mutex.releaseRecords);
  }
}

await ObservedMutexDemo.run();

console.log('observedMutex example passed.');
