import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AbortStartedEventEntity,
  AcquiredEventEntity,
  ConcurrencyAdjustedEventEntity,
  ContendedEventEntity,
  DrainCompletedEventEntity,
  DrainStartedEventEntity,
  FireOnAbortStartEffectEntity,
  FireOnAcquireEffectEntity,
  FireOnAcquireWaitEffectEntity,
  FireOnAdaptiveAdjustEffectEntity,
  FireOnContendedEffectEntity,
  FireOnDrainCompleteEffectEntity,
  FireOnDrainStartEffectEntity,
  FireOnReleaseEffectEntity,
  FireOnWindowSlideEffectEntity,
  QueuedEventEntity,
  SlotReleasedEventEntity,
  WindowSlidEventEntity
} from '../../../src/entities/index.js';

void describe('Throttle lifecycle entity contracts', () => {
  void it('validates complete JSON event payloads', () => {
    assert.equal(AbortStartedEventEntity.validate({ 'cancelledCount': 1, 'type': 'AbortStarted' }), true);
    assert.equal(AcquiredEventEntity.validate({ 'activeCount': 1, 'queuedCount': 0, 'type': 'Acquired' }), true);
    assert.equal(ConcurrencyAdjustedEventEntity.validate({ 'newLimit': 4, 'previousLimit': 2, 'type': 'ConcurrencyAdjusted' }), true);
    assert.equal(ContendedEventEntity.validate({ 'activeCount': 2, 'queuedCount': 1, 'type': 'Contended' }), true);
    assert.equal(DrainCompletedEventEntity.validate({ 'totalExecuted': 3, 'type': 'DrainCompleted' }), true);
    assert.equal(DrainStartedEventEntity.validate({ 'activeCount': 1, 'queuedCount': 2, 'type': 'DrainStarted' }), true);
    assert.equal(QueuedEventEntity.validate({ 'queuedCount': 1, 'type': 'Queued' }), true);
    assert.equal(SlotReleasedEventEntity.validate({ 'activeCount': 0, 'outcome': 'became-idle', 'totalExecuted': 3, 'type': 'SlotReleased' }), true);
    assert.equal(WindowSlidEventEntity.validate({ 'activeCount': 1, 'queuedCount': 0, 'type': 'WindowSlid' }), true);
  });

  void it('validates complete JSON effect payloads', () => {
    assert.equal(FireOnAbortStartEffectEntity.validate({ 'cancelledCount': 1, 'variant': 'FireOnAbortStart' }), true);
    assert.equal(FireOnAcquireEffectEntity.validate({ 'activeCount': 1, 'queuedCount': 0, 'variant': 'FireOnAcquire' }), true);
    assert.equal(FireOnAcquireWaitEffectEntity.validate({ 'queuedCount': 1, 'variant': 'FireOnAcquireWait' }), true);
    assert.equal(FireOnAdaptiveAdjustEffectEntity.validate({ 'newLimit': 4, 'previousLimit': 2, 'variant': 'FireOnAdaptiveAdjust' }), true);
    assert.equal(FireOnContendedEffectEntity.validate({ 'activeCount': 2, 'queuedCount': 1, 'variant': 'FireOnContended' }), true);
    assert.equal(FireOnDrainCompleteEffectEntity.validate({ 'totalExecuted': 3, 'variant': 'FireOnDrainComplete' }), true);
    assert.equal(FireOnDrainStartEffectEntity.validate({ 'activeCount': 1, 'queuedCount': 2, 'variant': 'FireOnDrainStart' }), true);
    assert.equal(FireOnReleaseEffectEntity.validate({ 'activeCount': 0, 'totalExecuted': 3, 'variant': 'FireOnRelease' }), true);
    assert.equal(FireOnWindowSlideEffectEntity.validate({ 'activeCount': 1, 'queuedCount': 0, 'variant': 'FireOnWindowSlide' }), true);
  });

  void it('rejects partial, negative, and unknown lifecycle payloads', () => {
    assert.equal(AcquiredEventEntity.validate({ 'activeCount': 1, 'type': 'Acquired' }), false);
    assert.equal(FireOnAcquireEffectEntity.validate({ 'activeCount': -1, 'queuedCount': 0, 'variant': 'FireOnAcquire' }), false);
    assert.equal(SlotReleasedEventEntity.validate({ 'activeCount': 0, 'outcome': 'unknown', 'totalExecuted': 3, 'type': 'SlotReleased' }), false);
    assert.equal(FireOnReleaseEffectEntity.validate({ 'activeCount': 0, 'extra': true, 'totalExecuted': 3, 'variant': 'FireOnRelease' }), false);
  });
});
