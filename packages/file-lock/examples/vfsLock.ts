/** vfsLock — builder demo injecting VirtualFileSystem as the lock backend. Run: npx tsx examples/vfsLock.ts */

// #region usage
import { VirtualFileSystem } from '@studnicky/virtual-fs';
import assert from 'node:assert/strict';

import { FileLock } from '../src/index.js';

const vfs = VirtualFileSystem.builder()
  .seed('/queue/jobs.json', '{"jobs":[]}')
  .build();

// Ensure the parent directory entry exists so FileLock can readdirSync it
// when checking for existing lock files during contention detection.
vfs.mkdirSync('/queue', { 'recursive': true });

const lock = await FileLock.builder()
  .withFileSystem(vfs)
  .withPath('/queue/jobs.json')
  .withPollMs(10)
  .withTimeoutMs(1000)
  .build();

console.log('lock acquired');

let contents: string;
try {
  contents = lock.read();
  console.log(`locked content: ${contents}`);

  lock.write('{"jobs":["task-1"]}');
  const updated = lock.read();
  console.log(`updated content: ${updated}`);
} finally {
  lock.release();
  console.log('lock released');
}
// #endregion usage

assert.equal(contents!, '{"jobs":[]}');
assert.ok(vfs.existsSync('/queue/jobs.json'), 'file should exist at original path after release');
assert.equal(vfs.readFileSync('/queue/jobs.json', 'utf8'), '{"jobs":["task-1"]}');

console.log('vfsLock: all assertions passed');
