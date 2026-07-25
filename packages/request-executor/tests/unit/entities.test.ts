import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RequestDeadlineEntity } from '../../src/index.js';

describe('request deadline entity', () => {
  it('validates omitted and non-negative deadlines', () => {
    assert.equal(RequestDeadlineEntity.validate({}), true);
    assert.equal(RequestDeadlineEntity.validate({ 'deadlineMs': 0 }), true);
  });

  it('rejects negative deadlines', () => {
    assert.equal(RequestDeadlineEntity.validate({ 'deadlineMs': -1 }), false);
  });
});
