/** observedMutex — demonstrates subclassing Mutex to observe afterAcquire and beforeRelease hooks. Run: npx tsx examples/observedMutex.ts */

import assert from 'node:assert/strict';

// #region usage
import { Mutex } from '../src/index.js';

type HookRecordType = {
  'holdTimeMs': number;
  'key': string;
  'waitTimeMs': number;
};

class ObservedMutex extends Mutex<string> {
  readonly acquireRecords: HookRecordType[] = [];
  readonly releaseRecords: Pick<HookRecordType, 'holdTimeMs' | 'key'>[] = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    this.acquireRecords.push({ 'holdTimeMs': 0, 'key': key, 'waitTimeMs': waitTimeMs });
  }

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    this.releaseRecords.push({ 'holdTimeMs': holdTimeMs, 'key': key });
  }
}

const mutex = new ObservedMutex();

// Run two exclusive operations on different keys
await Promise.all([
  mutex.runExclusive('alpha', async () => {
    await Promise.resolve();
  }),
  mutex.runExclusive('beta', async () => {
    await Promise.resolve();
  })
]);

// Run a sequential operation on the same key to exercise queueing
await mutex.runExclusive('alpha', async () => {
  await Promise.resolve();
});

console.log('Acquire records:', mutex.acquireRecords);
console.log('Release records:', mutex.releaseRecords);
// #endregion usage

assert.equal(mutex.acquireRecords.length, 3, `Expected 3 acquireRecords, got ${mutex.acquireRecords.length}`);
assert.equal(mutex.releaseRecords.length, 3, `Expected 3 releaseRecords, got ${mutex.releaseRecords.length}`);

for (const record of mutex.acquireRecords) {
  assert.ok(typeof record.waitTimeMs === 'number', 'waitTimeMs must be a number');
  assert.ok(record.waitTimeMs >= 0, 'waitTimeMs must be non-negative');
  assert.ok(typeof record.key === 'string', 'key must be a string');
}

for (const record of mutex.releaseRecords) {
  assert.ok(typeof record.holdTimeMs === 'number', 'holdTimeMs must be a number');
  assert.ok(record.holdTimeMs >= 0, 'holdTimeMs must be non-negative');
}

const acquiredKeys: string[] = [];
for (const record of mutex.acquireRecords) {
  acquiredKeys.push(record.key);
}
acquiredKeys.sort();
assert.deepEqual(acquiredKeys, ['alpha', 'alpha', 'beta']);

console.log('observedMutex: all assertions passed');
