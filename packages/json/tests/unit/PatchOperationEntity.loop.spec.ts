import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatchOperationEntity } from '../../src/entities/PatchOperationEntity.js';

void describe('PatchOperationEntity', () => {
  void it('accepts a payload each op-specific branch requires', () => {
    assert.equal(PatchOperationEntity.validate({ 'op': 'add', 'path': '/x', 'value': 1 }), true);
    assert.equal(PatchOperationEntity.validate({ 'from': '/y', 'op': 'copy', 'path': '/x' }), true);
    assert.equal(PatchOperationEntity.validate({ 'op': 'remove', 'path': '/x' }), true);
  });

  void it('rejects a payload no branch fully accepts, closed by additionalProperties: false', () => {
    // 'copy' requires 'from' and forbids 'value'; no branch admits both.
    assert.equal(PatchOperationEntity.validate({ 'from': '/y', 'op': 'copy', 'path': '/x', 'value': 1 }), false);
    // 'add' requires 'value'; omitting it satisfies no branch.
    assert.equal(PatchOperationEntity.validate({ 'op': 'add', 'path': '/x' }), false);
    // 'remove' admits neither 'from' nor 'value'.
    assert.equal(PatchOperationEntity.validate({ 'op': 'remove', 'path': '/x', 'value': 1 }), false);
  });
});
