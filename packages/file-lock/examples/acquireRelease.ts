/** acquireRelease — demonstrates create, write, read, and release with try/finally. Run: npx tsx examples/acquireRelease.ts */

import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const filePath = path.join(os.tmpdir(), `file-lock-example-${String(process.pid)}.txt`);
writeFileSync(filePath, 'initial content', 'utf8');

// #region usage
import { FileLock } from '../src/index.js';

const lock = await FileLock.create({ 'path': filePath });

let original: string;
let updated: string;

try {
  original = lock.read();
  console.log(`Original content: ${original}`);

  lock.write('updated content');
  updated = lock.read();
  console.log(`Updated content: ${updated}`);
} finally {
  lock.release();
}

console.log(`File exists after release: ${String(existsSync(filePath))}`);
// #endregion usage

assert.equal(original!, 'initial content');
assert.equal(updated!, 'updated content');
assert.ok(existsSync(filePath), 'file should exist at original path after release');

unlinkSync(filePath);

console.log('acquireRelease: all assertions passed');
