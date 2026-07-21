import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockOptionsEntity, FileLockPathStateEntity } from '../../src/index.js';

describe('file-lock entities', () => {
  it('validate lock options and retained path state', () => {
    assert.equal(FileLockOptionsEntity.validate({ 'path': '/tmp/data.json', 'timeoutMs': 100 }), true);
    assert.equal(FileLockPathStateEntity.validate({
      'lockPath': '/tmp/data.json.lock.owner',
      'originalPath': '/tmp/data.json'
    }), true);
  });

  it('rejects incomplete path state', () => {
    assert.equal(FileLockPathStateEntity.validate({ 'lockPath': '/tmp/data.json.lock.owner' }), false);
  });
});
