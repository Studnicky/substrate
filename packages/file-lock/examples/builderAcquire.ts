/** builderAcquire — acquire a lock via the fluent builder, then release. Run: npx tsx examples/builderAcquire.ts */

import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(os.tmpdir(), 'file-lock-example-'));
const filePath = path.join(dir, 'lock.txt');
writeFileSync(filePath, 'queued', 'utf8');

// #region usage
import { FileLock } from '../src/index.js';

const lock = await FileLock.builder()
  .withPath(filePath)
  .withPollMs(100)
  .withTimeoutMs(3000)
  .build();

let contents: string;

try {
  contents = lock.read();
  console.log(`Locked content: ${contents}`);
} finally {
  lock.release();
}
// #endregion usage

assert.equal(contents!, 'queued');
assert.ok(existsSync(filePath), 'file should exist at original path after release');

unlinkSync(filePath);

console.log('builderAcquire: all assertions passed');
