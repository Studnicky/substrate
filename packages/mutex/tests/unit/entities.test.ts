import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MutexQueueEntryEntity } from '../../src/index.js';

describe('mutex queue entry entity', () => {
  it('validates non-negative enqueue timestamps', () => {
    assert.equal(MutexQueueEntryEntity.validate({ 'queuedAt': 0 }), true);
    assert.equal(MutexQueueEntryEntity.validate({ 'queuedAt': Date.now() }), true);
  });

  it('rejects negative enqueue timestamps', () => {
    assert.equal(MutexQueueEntryEntity.validate({ 'queuedAt': -1 }), false);
  });
});
