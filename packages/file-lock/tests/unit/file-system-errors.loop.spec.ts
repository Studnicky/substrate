import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { FileLockFileSystemError } from '../../src/errors/FileLockFileSystemError.js';
import { FileLockInspection } from '../../src/FileLockInspection.js';
import { FileLockRecovery } from '../../src/FileLockRecovery.js';

void describe('file lock filesystem failures', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'file-lock-errors-'));
  });

  after(async () => {
    await rm(root, { 'force': true, 'recursive': true });
  });

  void it('inspect() surfaces an unreadable directory as a FileLockFileSystemError with the fs error as cause', () => {
    const path = join(root, 'missing-directory', 'data.json');

    assert.throws(() => {
      FileLockInspection.inspect({ 'path': path });
    }, (error: unknown) => {
      assert.ok(error instanceof FileLockFileSystemError);
      assert.equal(error.code, 'fileLock.fileSystemFailed');
      assert.equal(error.operation, 'inspect');
      assert.equal(error.path, path);
      assert.ok(Predicates.isObject(error.cause));
      assert.equal(error.cause.code, 'ENOENT');
      return true;
    });
  });

  void it('restore() surfaces a missing lock file as a FileLockFileSystemError with the fs error as cause', () => {
    const originalPath = join(root, 'data.json');

    assert.throws(() => {
      FileLockRecovery.restore({
        'inspection': { 'lockPath': `${originalPath}.lock.4242`, 'originalPath': originalPath, 'ownerToken': '4242' }
      });
    }, (error: unknown) => {
      assert.ok(error instanceof FileLockFileSystemError);
      assert.equal(error.operation, 'recover');
      assert.ok(Predicates.isObject(error.cause));
      assert.equal(error.cause.code, 'ENOENT');
      return true;
    });
  });
});
