import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ActiveOperationStateEntity, ThrottleAbortOptionsEntity } from '../../../src/index.js';

describe('throttle entity contracts', () => {
  it('validates abort options', () => {
    assert.equal(ThrottleAbortOptionsEntity.validate({ 'timeout': 100 }), true);
    assert.equal(ThrottleAbortOptionsEntity.validate({ 'timeout': -1 }), false);
  });

  it('validates active operation state', () => {
    assert.equal(ActiveOperationStateEntity.validate({ 'completed': false }), true);
    assert.equal(ActiveOperationStateEntity.validate({}), false);
  });
});
