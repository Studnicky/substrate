import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MkdirOptionsEntity } from '../../../src/index.js';

describe('MkdirOptionsEntity', () => {
  it('accepts recursive directory options', () => {
    assert.equal(MkdirOptionsEntity.validate({ 'recursive': true }), true);
  });

  it('rejects non-boolean recursive values', () => {
    assert.equal(MkdirOptionsEntity.validate({ 'recursive': 'yes' }), false);
  });
});
