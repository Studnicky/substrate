import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBufferStateEntity } from '../../../src/index.js';

void describe('CircularBufferStateEntity', () => {
  void it('accepts a non-negative integer length', () => {
    assert.equal(CircularBufferStateEntity.validate({ 'length': 0 }), true);
  });

  void it('rejects negative and fractional lengths', () => {
    assert.equal(CircularBufferStateEntity.validate({ 'length': -1 }), false);
    assert.equal(CircularBufferStateEntity.validate({ 'length': 1.5 }), false);
  });
});
