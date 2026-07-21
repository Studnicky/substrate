import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  InterpreterHistoryRecordMetadataEntity,
  RegisteredInterpreterMetricsEntity
} from '../../../src/index.js';

void describe('FSM metadata entities', () => {
  void it('validates non-negative history timestamps', () => {
    assert.equal(InterpreterHistoryRecordMetadataEntity.validate({ 'timestamp': Date.now() }), true);
    assert.equal(InterpreterHistoryRecordMetadataEntity.validate({ 'timestamp': -1 }), false);
  });

  void it('validates non-negative integer hook error counts', () => {
    assert.equal(RegisteredInterpreterMetricsEntity.validate({ 'hookErrorCount': 0 }), true);
    assert.equal(RegisteredInterpreterMetricsEntity.validate({ 'hookErrorCount': 0.5 }), false);
  });
});
