/** usingDispose — demonstrates Symbol.dispose for explicit resource management. Run: npx tsx examples/usingDispose.ts */

import assert from 'node:assert/strict';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const filePath = path.join(os.tmpdir(), `file-lock-dispose-${String(process.pid)}.txt`);
writeFileSync(filePath, 'dispose test', 'utf8');

// #region usage
import { FileLock } from '../src/index.js';

const lock = await FileLock.create({ 'path': filePath });

lock.write('written via lock');
const content = lock.read();
console.log(`Content: ${content}`);

// Explicitly invoke Symbol.dispose — same as release
lock[Symbol.dispose]();
console.log(`File exists after dispose: ${String(existsSync(filePath))}`);

// Calling release again is safe (idempotent)
lock.release();
console.log(`File exists after redundant release: ${String(existsSync(filePath))}`);
// #endregion usage

assert.equal(content, 'written via lock');
assert.ok(existsSync(filePath), 'file should be back at original path');

unlinkSync(filePath);

console.log('usingDispose: all assertions passed');
