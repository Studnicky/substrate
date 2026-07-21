import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CloudWatchLogSchemaFieldsEntity,
  LogBody,
  LogDataEntity,
  LoggerHookEventKindEntity
} from '../../src/index.js';

describe('logger composition entities', () => {
  it('validates log-data alternatives and CloudWatch fields', () => {
    const body = LogBody.create({
      'component': 'worker',
      'context': {},
      'message': 'complete',
      'operation': 'run',
      'status': 'success'
    });

    assert.equal(LogDataEntity.validate(body), true);
    assert.equal(CloudWatchLogSchemaFieldsEntity.validate({
      'level': 2,
      'msg': 'complete',
      'service': 'api',
      'time': '2026-07-19T00:00:00.000Z'
    }), true);
    assert.equal(LoggerHookEventKindEntity.validate('transportError'), true);
  });

  it('rejects values outside the composed schemas', () => {
    assert.equal(LogDataEntity.validate({ 'message': 'missing fields' }), false);
    assert.equal(LoggerHookEventKindEntity.validate('unknown'), false);
  });
});
