import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TestWorkspace } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FileLockFileSystemError } from '../../../src/file-lock/errors/FileLockFileSystemError.js';
import { FileLockInspection } from '../../../src/file-lock/FileLockInspection.js';
import { FileLockRecovery } from '../../../src/file-lock/FileLockRecovery.js';

void describe('file lock filesystem failures', () => {
  void it('inspect() surfaces an unreadable directory as a FileLockFileSystemError with the fs error as cause', () => {
    using workspace = TestWorkspace.create('file-lock-errors-');
    const path = workspace.resolve('missing-directory', 'data.json');

    assert.throws(
      () => {
        FileLockInspection.inspect({ 'path': path });
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof FileLockFileSystemError);
        assert.equal(error.code, 'fileLock.fileSystemFailed');
        assert.equal(error.operation, 'inspect');
        assert.equal(error.path, path);
        assert.ok(Predicates.isObject(error.cause));
        const cause = error.cause;
        if (Predicates.isObject(cause)) {
          const codeField = Reflect.get(cause, 'code');
          assert.equal(codeField, 'ENOENT');
        }
        return true;
      }
    );
  });

  void it('restore() surfaces a missing lock file as a FileLockFileSystemError with the fs error as cause', () => {
    using workspace = TestWorkspace.create('file-lock-errors-');
    const originalPath = workspace.resolve('data.json');

    assert.throws(
      () => {
        FileLockRecovery.restore({
          'inspection': {
            'lockPath': `${originalPath}.lock.4242`,
            'originalPath': originalPath,
            'ownerToken': '4242'
          }
        });
      },
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof FileLockFileSystemError);
        assert.equal(error.operation, 'recover');
        assert.ok(Predicates.isObject(error.cause));
        const cause = error.cause;
        if (Predicates.isObject(cause)) {
          const codeField = Reflect.get(cause, 'code');
          assert.equal(codeField, 'ENOENT');
        }
        return true;
      }
    );
  });
});
