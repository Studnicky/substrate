import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DraftNodeStateEntity,
  PatchApplyResultStatusEntity,
  PathWildcardResultEntity
} from '../../../src/index.js';

void describe('JSON internal data entities', () => {
  void it('validates draft-node state', () => {
    assert.equal(DraftNodeStateEntity.validate({ 'isArray': true }), true);
    assert.equal(DraftNodeStateEntity.validate({ 'isArray': 'yes' }), false);
  });

  void it('validates patch-application status', () => {
    assert.equal(PatchApplyResultStatusEntity.validate({ 'success': true }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({ 'error': 'failed', 'success': false }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({}), false);
  });

  void it('validates wildcard path metadata', () => {
    assert.equal(PathWildcardResultEntity.validate({
      'isWildcard': true,
      'remainingPath': ['items', 'name']
    }), true);
    assert.equal(PathWildcardResultEntity.validate({ 'isWildcard': false, 'remainingPath': [] }), false);
  });
});
