import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CancellableTaskStateEntity,
  CancellableTaskTransitionEventEntity
} from '../../src/entities/index.js';

void describe('CancellableTask lifecycle entities', () => {
  void it('intakes complete lifecycle state and transition event objects', () => {
    assert.deepEqual(CancellableTaskStateEntity.intake({ 'variant': 'pending' }), { 'variant': 'pending' });
    assert.deepEqual(
      CancellableTaskTransitionEventEntity.intake({ 'to': 'cancelled', 'type': 'transitionTo' }),
      { 'to': 'cancelled', 'type': 'transitionTo' }
    );
  });

  void it('rejects scalar states, extraneous properties, and invalid transition targets', () => {
    assert.throws(() => CancellableTaskStateEntity.intake('pending'));
    assert.throws(() => CancellableTaskStateEntity.intake({ 'extra': true, 'variant': 'pending' }));
    assert.throws(() => CancellableTaskTransitionEventEntity.intake({ 'to': 'active', 'type': 'transitionTo' }));
  });
});
