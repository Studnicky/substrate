import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SampleBufferStateEntity } from '../../../src/index.js';

describe('SampleBufferStateEntity', () => {
  it('accepts valid observable buffer state', () => {
    assert.equal(SampleBufferStateEntity.validate({ 'isFull': true, 'length': 4 }), true);
  });

  it('rejects negative lengths', () => {
    assert.equal(SampleBufferStateEntity.validate({ 'isFull': false, 'length': -1 }), false);
  });
});
