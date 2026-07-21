import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatchOperationCoreEntity } from '../../../src/entities/PatchOperationCoreEntity.js';

void describe('PatchOperationCoreEntity', () => {
  void it('validates canonical RFC-6902 core fields', () => {
    assert.strictEqual(PatchOperationCoreEntity.validate({ op: 'replace', path: '/name' }), true);
  });

  void it('rejects an unknown operation variant', () => {
    assert.strictEqual(PatchOperationCoreEntity.validate({ op: 'merge', path: '/name' }), false);
  });

  void it('rejects an operation without a path', () => {
    assert.strictEqual(PatchOperationCoreEntity.validate({ op: 'remove' }), false);
  });
});
