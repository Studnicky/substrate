import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WorkerErrorEnvelopeEntity,
  WorkerLogEnvelopeEntity,
  WorkerPoolConfigEntity,
  WorkerProgressEnvelopeEntity,
  WorkerResultEnvelopeDiscriminantEntity,
  WorkerTaskDispositionEntity,
  WorkerTaskIndexEntity
} from '../../src/index.js';

describe('worker-pool entities', () => {
  it('validate configuration, task state, and every envelope discriminant', () => {
    assert.equal(WorkerPoolConfigEntity.validate({ 'workerPath': '/tmp/worker.mjs' }), true);
    assert.equal(WorkerTaskIndexEntity.validate({ 'index': 0 }), true);
    assert.equal(WorkerTaskDispositionEntity.validate({ 'retried': false, 'settled': false }), true);
    assert.equal(WorkerErrorEnvelopeEntity.validate({ 'error': 'failed', 'type': 'error' }), true);
    assert.equal(WorkerLogEnvelopeEntity.validate({ 'message': 'working', 'type': 'log' }), true);
    assert.equal(WorkerProgressEnvelopeEntity.validate({ 'percent': 50, 'type': 'progress' }), true);
    assert.equal(WorkerResultEnvelopeDiscriminantEntity.validate({ 'type': 'result', 'value': 42 }), true);
  });

  it('rejects invalid task state and envelope discriminants', () => {
    assert.equal(WorkerTaskIndexEntity.validate({ 'index': -1 }), false);
    assert.equal(WorkerProgressEnvelopeEntity.validate({ 'percent': 101, 'type': 'progress' }), false);
    assert.equal(WorkerResultEnvelopeDiscriminantEntity.validate({ 'type': 'error' }), false);
  });
});
