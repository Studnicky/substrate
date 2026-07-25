import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdempotencyGuardEntryMetadataEntity } from '../../../src/index.js';

void describe('IdempotencyGuardEntryMetadataEntity', () => {
  void it('accepts a string fingerprint', () => {
    assert.equal(IdempotencyGuardEntryMetadataEntity.validate({ 'fingerprint': 'f00dbabe' }), true);
  });

  void it('rejects missing and non-string fingerprints', () => {
    assert.equal(IdempotencyGuardEntryMetadataEntity.validate({}), false);
    assert.equal(IdempotencyGuardEntryMetadataEntity.validate({ 'fingerprint': 42 }), false);
  });
});
