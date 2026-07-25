import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AsyncIterDoneDiscriminantEntity,
  AsyncIterErrorDiscriminantEntity,
  AsyncIterValueDiscriminantEntity,
  ChannelEntryStateEntity,
  ChannelStateEntity,
  DispatchCompletedEventEntity,
  DispatchStartedEventEntity,
  SemaphoreWaiterStateEntity
} from '../../src/index.js';

describe('concurrency entities', () => {
  it('validate internal state and dispatch event contracts', () => {
    assert.equal(AsyncIterDoneDiscriminantEntity.validate({ 'variant': 'done' }), true);
    assert.equal(AsyncIterErrorDiscriminantEntity.validate({ 'variant': 'error' }), true);
    assert.equal(AsyncIterValueDiscriminantEntity.validate({ 'variant': 'value' }), true);
    assert.equal(ChannelEntryStateEntity.validate({ 'cancelled': false }), true);
    assert.equal(ChannelStateEntity.validate({ 'closed': false, 'subscriber': true }), true);
    assert.equal(SemaphoreWaiterStateEntity.validate({ 'cancelled': false, 'ready': true }), true);
    assert.equal(DispatchStartedEventEntity.validate({ 'key': 'task-1' }), true);
    assert.equal(DispatchCompletedEventEntity.validate({ 'key': 'task-1', 'result': 'done' }), true);
  });

  it('rejects invalid discriminants and state', () => {
    assert.equal(AsyncIterDoneDiscriminantEntity.validate({ 'variant': 'value' }), false);
    assert.equal(ChannelStateEntity.validate({ 'closed': false }), false);
    assert.equal(DispatchCompletedEventEntity.validate({ 'key': '', 'result': 'done' }), false);
  });
});
