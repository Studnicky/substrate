/** timeoutContention — demonstrates FileLockTimeoutError when lock cannot be acquired. Run: npx tsx examples/timeoutContention.ts */

import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const filePath = path.join(os.tmpdir(), `file-lock-contention-${String(process.pid)}.txt`);
writeFileSync(filePath, 'contention test', 'utf8');

// #region usage
import { FileLock, FileLockTimeoutError } from '../src/index.js';

// Hold the first lock
const firstLock = await FileLock.acquire(filePath);

let caught: FileLockTimeoutError | undefined;

try {
  // Try to acquire again with a short timeout — throws because the file is at the lock path
  try {
    await FileLock.acquire(filePath, { 'pollMs': 50, 'timeoutMs': 200 });
  } catch (err) {
    if (err instanceof FileLockTimeoutError) {
      caught = err;
      console.log(`Timed out after ${String(err.timeoutMs)}ms on ${err.path}`);
    }
  }
} finally {
  firstLock.release();
}

console.log(`File exists after release: ${String(existsSync(filePath))}`);
// #endregion usage

assert.ok(caught instanceof FileLockTimeoutError, 'should have thrown FileLockTimeoutError');
assert.equal(caught.path, filePath);
assert.equal(caught.timeoutMs, 200);
assert.ok(existsSync(filePath), 'file should exist after release');

unlinkSync(filePath);

console.log('timeoutContention: all assertions passed');
