/**
 * FileLock Unit Tests
 *
 * Tests atomic rename-based file locking:
 * - create() on an existing unlocked file
 * - create() on a non-existent file (FileLockTimeoutError)
 * - create() contention — times out when lock already held
 * - read() after create
 * - write() + release() round-trip
 * - idempotent release()
 * - [Symbol.dispose]() delegates to release()
 * - builder() path via FileLockBuilder
 */

import { strictEqual, ok, rejects } from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, beforeEach, afterEach } from 'node:test';

import { FileLock, FileLockTimeoutError } from '../../src/index.js';

const TEST_DIR = join(tmpdir(), `file-lock-tests-${String(process.pid)}`);

class FileLockTestHelpers {
  public static makePath(name: string): string {
    return join(TEST_DIR, name);
  }
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// create() — timeout scenarios
// ---------------------------------------------------------------------------

const timeoutScenarios: Array<{ description: string; setup: () => void; path: () => string }> = [
  {
    description: 'throws FileLockTimeoutError when file does not exist',
    setup: () => {},
    path: () => FileLockTestHelpers.makePath('nonexistent.txt'),
  },
];

for (const { description, setup, path } of timeoutScenarios) {
  it(description, async () => {
    setup();
    await rejects(
      FileLock.create({ path: path(), timeoutMs: 100 }),
      (e: unknown) => e instanceof FileLockTimeoutError
    );
  });
}

// ---------------------------------------------------------------------------
// create() — success
// ---------------------------------------------------------------------------

it('succeeds when file exists and is not locked', async () => {
  const path = FileLockTestHelpers.makePath('test-acquire.txt');
  writeFileSync(path, 'hello');

  const lock = await FileLock.create({ path });
  ok(!existsSync(path), 'original path should not exist while locked');

  lock.release();
  ok(existsSync(path), 'original path should be restored after release');
});

// ---------------------------------------------------------------------------
// create() — contention
// ---------------------------------------------------------------------------

it('times out when trying to acquire a lock already held', async () => {
  const path = FileLockTestHelpers.makePath('test-contention.txt');
  writeFileSync(path, 'content');

  const lock = await FileLock.create({ path });

  await rejects(
    FileLock.create({ path, timeoutMs: 100 }),
    (error: unknown) => error instanceof FileLockTimeoutError
  );

  lock.release();
});

// ---------------------------------------------------------------------------
// read()
// ---------------------------------------------------------------------------

it('returns file content after create', async () => {
  const path = FileLockTestHelpers.makePath('test-read.txt');
  writeFileSync(path, 'content-to-read');

  const lock = await FileLock.create({ path });
  strictEqual(lock.read(), 'content-to-read');

  lock.release();
});

// ---------------------------------------------------------------------------
// write() + release()
// ---------------------------------------------------------------------------

it('restores original path with new content after write and release', async () => {
  const path = FileLockTestHelpers.makePath('test-write.txt');
  writeFileSync(path, 'original');

  const lock = await FileLock.create({ path });
  lock.write('updated');
  lock.release();

  ok(existsSync(path), 'file should exist at original path');
  const { readFileSync } = await import('node:fs');
  strictEqual(readFileSync(path, 'utf8'), 'updated');
});

// ---------------------------------------------------------------------------
// release()
// ---------------------------------------------------------------------------

it('is idempotent — calling twice does not throw', async () => {
  const path = FileLockTestHelpers.makePath('test-idempotent.txt');
  writeFileSync(path, 'data');

  const lock = await FileLock.create({ path });
  lock.release();
  lock.release(); // must not throw
});

// ---------------------------------------------------------------------------
// [Symbol.dispose]()
// ---------------------------------------------------------------------------

it('calls release when disposed', async () => {
  const path = FileLockTestHelpers.makePath('test-dispose.txt');
  writeFileSync(path, 'dispose-me');

  const lock = await FileLock.create({ path });
  ok(!existsSync(path), 'original should not exist while locked');

  lock[Symbol.dispose]();
  ok(existsSync(path), 'original should be restored after dispose');
});

// ---------------------------------------------------------------------------
// builder()
// ---------------------------------------------------------------------------

it('builder acquires lock via withPath and build', async () => {
  const path = FileLockTestHelpers.makePath('test-builder.txt');
  writeFileSync(path, 'builder-content');

  const lock = await FileLock.builder().withPath(path).build();
  ok(!existsSync(path), 'original path should not exist while locked via builder');

  lock.release();
  ok(existsSync(path), 'original path should be restored after release');
});

it('builder respects withPollMs and withTimeoutMs', async () => {
  const path = FileLockTestHelpers.makePath('test-builder-opts.txt');
  writeFileSync(path, 'content');

  const firstLock = await FileLock.create({ path });

  await rejects(
    FileLock.builder().withPath(path).withPollMs(25).withTimeoutMs(100).build(),
    (error: unknown) => error instanceof FileLockTimeoutError
  );

  firstLock.release();
});

it('builder throws FileLockConfigError when path is not set', async () => {
  const { FileLockConfigError } = await import('../../src/index.js');
  await rejects(
    FileLock.builder().build(),
    (error: unknown) => error instanceof FileLockConfigError
  );
});
