import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DlqEntryMetadataEntity } from '../../src/index.js';

describe('DLQ entry metadata entity', () => {
  it('validates complete entry metadata', () => {
    assert.equal(DlqEntryMetadataEntity.validate({
      'enqueuedAtMs': 0,
      'id': 'entry-1',
      'reason': 'processing failed'
    }), true);
  });

  it('rejects empty identifiers and reasons', () => {
    assert.equal(DlqEntryMetadataEntity.validate({
      'enqueuedAtMs': 0,
      'id': '',
      'reason': ''
    }), false);
  });
});
