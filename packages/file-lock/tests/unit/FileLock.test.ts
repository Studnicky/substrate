/**
 * FileLock Unit Tests
 *
 * Tests atomic rename-based file locking:
 * - acquire() on an existing unlocked file
 * - acquire() on a non-existent file (FileLockTimeoutError)
 * - read() after acquire
 * - write() + release() round-trip
 * - idempotent release()
 * - [Symbol.dispose]() delegates to release()
 */

import { strictEqual, ok, rejects } from 'node:assert/strict';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, beforeEach, afterEach } from 'node:test';

import { FileLock, FileLockTimeoutError } from '../../src/index.js';

const TEST_DIR = join(tmpdir(), `file-lock-tests-${String(process.pid)}`);

const makePath = (name: string): string => join(TEST_DIR, name);

void describe('FileLock', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  void describe('acquire()', () => {
    void it('succeeds when file exists and is not locked', async () => {
      const path = makePath('test-acquire.txt');
      writeFileSync(path, 'hello');

      const lock = await FileLock.acquire(path);
      ok(!existsSync(path), 'original path should not exist while locked');

      lock.release();
      ok(existsSync(path), 'original path should be restored after release');
    });

    void it('throws FileLockTimeoutError when file does not exist', async () => {
      const path = makePath('nonexistent.txt');

      await rejects(
        FileLock.acquire(path, { timeoutMs: 100 }),
        (error: unknown) => {
          return error instanceof FileLockTimeoutError;
        }
      );
    });
  });

  void describe('read()', () => {
    void it('returns file content after acquire', async () => {
      const path = makePath('test-read.txt');
      writeFileSync(path, 'content-to-read');

      const lock = await FileLock.acquire(path);
      strictEqual(lock.read(), 'content-to-read');

      lock.release();
    });
  });

  void describe('write() + release()', () => {
    void it('restores original path with new content after write and release', async () => {
      const path = makePath('test-write.txt');
      writeFileSync(path, 'original');

      const lock = await FileLock.acquire(path);
      lock.write('updated');
      lock.release();

      ok(existsSync(path), 'file should exist at original path');
      const { readFileSync } = await import('node:fs');
      strictEqual(readFileSync(path, 'utf8'), 'updated');
    });
  });

  void describe('release()', () => {
    void it('is idempotent — calling twice does not throw', async () => {
      const path = makePath('test-idempotent.txt');
      writeFileSync(path, 'data');

      const lock = await FileLock.acquire(path);
      lock.release();
      lock.release(); // must not throw
    });
  });

  void describe('[Symbol.dispose]()', () => {
    void it('calls release when disposed', async () => {
      const path = makePath('test-dispose.txt');
      writeFileSync(path, 'dispose-me');

      const lock = await FileLock.acquire(path);
      ok(!existsSync(path), 'original should not exist while locked');

      lock[Symbol.dispose]();
      ok(existsSync(path), 'original should be restored after dispose');
    });
  });
});
