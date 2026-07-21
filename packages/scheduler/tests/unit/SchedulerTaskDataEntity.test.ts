import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SchedulerTaskDataEntity } from '../../src/index.js';

describe('SchedulerTaskDataEntity', () => {
  it('accepts valid task data', () => {
    assert.equal(SchedulerTaskDataEntity.validate({
      'atMs': 100,
      'intervalMs': 25,
      'variant': 'interval'
    }), true);
  });

  it('rejects negative intervals', () => {
    assert.equal(SchedulerTaskDataEntity.validate({
      'atMs': 100,
      'intervalMs': -1,
      'variant': 'interval'
    }), false);
  });
});
