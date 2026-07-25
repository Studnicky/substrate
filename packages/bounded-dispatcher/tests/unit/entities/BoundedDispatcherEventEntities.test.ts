import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BoundedDispatcherErrorEventEntity,
  BoundedDispatcherStartEventEntity,
  BoundedDispatcherSuccessEventEntity
} from '../../../src/index.js';

void describe('bounded dispatcher event entities', () => {
  void it('validate their canonical phase discriminants', () => {
    assert.equal(BoundedDispatcherStartEventEntity.validate({ 'phase': 'start' }), true);
    assert.equal(BoundedDispatcherSuccessEventEntity.validate({ 'phase': 'success' }), true);
    assert.equal(BoundedDispatcherErrorEventEntity.validate({ 'phase': 'error' }), true);
  });

  void it('reject mismatched phases and extra data', () => {
    assert.equal(BoundedDispatcherStartEventEntity.validate({ 'phase': 'success' }), false);
    assert.equal(BoundedDispatcherSuccessEventEntity.validate({ 'phase': 'success', 'result': 'runtime' }), false);
    assert.equal(BoundedDispatcherErrorEventEntity.validate({ 'error': 'runtime', 'phase': 'error' }), false);
  });
});
