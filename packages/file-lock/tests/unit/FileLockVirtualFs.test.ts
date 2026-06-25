/**
 * FileLockVirtualFs Unit Tests
 *
 * Verifies that an injected FileSystemInterface (VirtualFileSystem) achieves
 * the same mutual-exclusion semantics as the real Node.js filesystem adapter.
 */

import { ok, rejects } from 'node:assert/strict';
import { it } from 'node:test';

import { VirtualFileSystem } from '@studnicky/virtual-fs';

import { FileLock, FileLockTimeoutError } from '../../src/index.js';

it('mutual exclusion works with injected VirtualFileSystem', async () => {
  const vfs = VirtualFileSystem.create({
    'seed': new Map([['/data.json', '{"value":1}']])
  });

  const lock1 = await FileLock.create({
    'fileSystem': vfs,
    'path': '/data.json',
    'timeoutMs': 5000,
  });

  ok(lock1 !== undefined, 'first lock acquired');

  // Second lock on same path must contend and time out.
  await rejects(
    FileLock.create({ 'fileSystem': vfs, 'path': '/data.json', 'timeoutMs': 200 }),
    (error: unknown) => error instanceof FileLockTimeoutError
  );

  lock1.release();

  // After release, a third lock must succeed.
  const lock3 = await FileLock.create({
    'fileSystem': vfs,
    'path': '/data.json',
    'timeoutMs': 1000,
  });
  ok(lock3 !== undefined, 'lock acquired after release');
  lock3.release();
});

it('read() and write() operate on the injected VirtualFileSystem', async () => {
  const vfs = VirtualFileSystem.create({
    'seed': new Map([['/config.json', '{"version":1}']])
  });

  const lock = await FileLock.create({
    'fileSystem': vfs,
    'path': '/config.json',
    'timeoutMs': 1000,
  });

  const { strictEqual } = await import('node:assert/strict');
  strictEqual(lock.read(), '{"version":1}', 'reads original content from vfs');

  lock.write('{"version":2}');
  lock.release();

  // Reacquire to verify written content persisted in vfs.
  const lock2 = await FileLock.create({
    'fileSystem': vfs,
    'path': '/config.json',
    'timeoutMs': 1000,
  });
  strictEqual(lock2.read(), '{"version":2}', 'written content persists after release');
  lock2.release();
});
