import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  VisibleRangeConfigDataEntity,
  VisibleRangeResolvedConfigEntity
} from '../../../src/index.js';

describe('visible-range entity contracts', () => {
  it('validates serializable input fields', () => {
    assert.equal(VisibleRangeConfigDataEntity.validate({ 'count': 10, 'itemSize': 20, 'overscan': 2 }), true);
    assert.equal(VisibleRangeConfigDataEntity.validate({ 'count': -1 }), false);
  });

  it('validates resolved configuration state', () => {
    assert.equal(VisibleRangeResolvedConfigEntity.validate({
      'count': 10,
      'mode': 'variable',
      'overscan': 1
    }), true);
    assert.equal(VisibleRangeResolvedConfigEntity.validate({
      'count': 10,
      'mode': 'other',
      'overscan': 1
    }), false);
  });
});
