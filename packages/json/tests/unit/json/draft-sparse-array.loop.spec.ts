import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Draft } from '../../../src/index.js';

class SparseArrayFixture {
  /** Builds a genuinely sparse array — index 1 is a hole, never assigned — without literal comma-hole syntax. */
  static create(): number[] {
    const result: number[] = [];
    result[0] = 1;
    result[2] = 3;
    return result;
  }
}

void describe('Draft sparse array holes', () => {
  void it('preserves holes in an untouched sparse array round-tripped through a draft', () => {
    const base: { 'list': number[]; 'other'?: boolean } = { 'list': SparseArrayFixture.create() };

    const next = Draft.produce(base, (draft) => {
      draft.other = true;
    });

    assert.equal(0 in next.list, true);
    assert.equal(1 in next.list, false);
    assert.equal(2 in next.list, true);
    assert.deepEqual(next.list[0], 1);
    assert.deepEqual(next.list[2], 3);
  });

  void it('preserves holes in a sparse array whose sibling index was mutated', () => {
    const base: { 'list': number[]; 'other'?: boolean } = { 'list': SparseArrayFixture.create() };

    const next = Draft.produce(base, (draft) => {
      draft.list[2] = 30;
    });

    assert.equal(0 in next.list, true);
    assert.equal(1 in next.list, false);
    assert.equal(2 in next.list, true);
    assert.equal(next.list[0], 1);
    assert.equal(next.list[2], 30);
  });
});
