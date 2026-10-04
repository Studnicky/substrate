import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ChannelKeyStateEntity,
  ChannelKeyTransitionEventEntity,
  CoalesceKeyStateEntity,
  CoalesceKeyTransitionEventEntity,
  SemaphoreGrantStateEntity,
  SemaphoreGrantTransitionEventEntity,
  SemaphoreWaiterStateEntity,
  SemaphoreWaiterTransitionEventEntity
} from '../../src/entities/index.js';

void describe('concurrency lifecycle entities', () => {
  void it('accepts canonical lifecycle state and transition objects', () => {
    assert.equal(ChannelKeyStateEntity.validate({ 'variant': 'open-idle' }), true);
    assert.equal(ChannelKeyTransitionEventEntity.validate({ 'type': 'subscribe' }), true);
    assert.equal(CoalesceKeyStateEntity.validate({ 'variant': 'idle' }), true);
    assert.equal(CoalesceKeyTransitionEventEntity.validate({ 'type': 'start' }), true);
    assert.equal(SemaphoreGrantStateEntity.validate({ 'variant': 'idle' }), true);
    assert.equal(SemaphoreGrantTransitionEventEntity.validate({ 'type': 'start' }), true);
    assert.equal(SemaphoreWaiterStateEntity.validate({ 'variant': 'queued' }), true);
    assert.equal(SemaphoreWaiterTransitionEventEntity.validate({ 'type': 'markReady' }), true);
  });

  void it('rejects incomplete and extended lifecycle objects', () => {
    assert.equal(ChannelKeyStateEntity.validate({ 'extra': true, 'variant': 'open-idle' }), false);
    assert.equal(ChannelKeyTransitionEventEntity.validate({}), false);
    assert.equal(CoalesceKeyStateEntity.validate({ 'variant': 'unknown' }), false);
    assert.equal(CoalesceKeyTransitionEventEntity.validate({ 'type': 'unknown' }), false);
    assert.equal(SemaphoreGrantStateEntity.validate({}), false);
    assert.equal(SemaphoreGrantTransitionEventEntity.validate({ 'extra': true, 'type': 'start' }), false);
    assert.equal(SemaphoreWaiterStateEntity.validate({ 'extra': true, 'variant': 'queued' }), false);
    assert.equal(SemaphoreWaiterTransitionEventEntity.validate({}), false);
  });
});
