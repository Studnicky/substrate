import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CacheLookupEntity } from '../../src/index.js';

describe('memoize entities', () => {
  it('validates cache lookup state', () => {
    assert.equal(CacheLookupEntity.validate({ 'found': true }), true);
    assert.equal(CacheLookupEntity.validate({ 'found': false }), true);
  });

  it('rejects a missing cache lookup state', () => {
    assert.equal(CacheLookupEntity.validate({}), false);
  });
});
