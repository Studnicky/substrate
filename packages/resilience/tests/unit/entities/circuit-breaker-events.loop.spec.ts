import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CircuitBreakerCallFailedEventEntity,
  CircuitBreakerOnFailureEffectEntity
} from '../../../src/entities/index.js';

void describe('circuit-breaker JSON lifecycle entities', () => {
  void it('validates call-failure event fields independently of the runtime Error extension', () => {
    assert.equal(CircuitBreakerCallFailedEventEntity.validate({ 'at': 42, 'type': 'callFailed' }), true);
    assert.equal(CircuitBreakerCallFailedEventEntity.validate({ 'at': '42', 'type': 'callFailed' }), false);
    assert.equal(CircuitBreakerCallFailedEventEntity.validate({ 'at': 42, 'type': 'callSucceeded' }), false);
  });

  void it('validates the failure-effect discriminator independently of the runtime Error extension', () => {
    assert.equal(CircuitBreakerOnFailureEffectEntity.validate({ 'variant': 'onFailure' }), true);
    assert.equal(CircuitBreakerOnFailureEffectEntity.validate({ 'variant': 'onSuccess' }), false);
  });
});
