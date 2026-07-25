import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FlagContextEntity } from '../../../src/index.js';

void describe('FlagContextEntity', () => {
  void it('accepts an optional string targeting key', () => {
    assert.equal(FlagContextEntity.validate({}), true);
    assert.equal(FlagContextEntity.validate({ 'targetingKey': 'user-42' }), true);
  });

  void it('rejects non-string targeting keys', () => {
    assert.equal(FlagContextEntity.validate({ 'targetingKey': 42 }), false);
  });
});
