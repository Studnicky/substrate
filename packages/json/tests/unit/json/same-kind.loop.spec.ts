import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SameKindError } from '../../../src/errors/SameKindError.js';
import { SameKind } from '../../../src/json/SameKind.js';

interface SameKindMismatchInterface {
  readonly 'candidate': unknown;
  readonly 'name': string;
  readonly 'original': unknown;
}

const mismatches: readonly SameKindMismatchInterface[] = [
  { 'candidate': [], 'name': 'array from object', 'original': {} },
  { 'candidate': new Map<string, string>(), 'name': 'map from object', 'original': {} },
  { 'candidate': new Set<string>(), 'name': 'set from array', 'original': [] },
  { 'candidate': null, 'name': 'null from object', 'original': {} },
  { 'candidate': 'text', 'name': 'string from number', 'original': 1 }
];

void describe('SameKind', () => {
  for (const mismatch of mismatches) {
    void it(`rejects ${mismatch.name} with SameKindError`, () => {
      assert.throws(() => SameKind.assert(mismatch.candidate, mismatch.original), (error: unknown) => {
        assert.ok(error instanceof SameKindError);
        assert.equal(error.name, 'SameKindError');
        assert.equal(error.code, 'json.kindMismatch');

        return true;
      });
    });
  }

  void it('returns a candidate that shares the original kind', () => {
    const candidate = { 'a': 1 };

    assert.equal(SameKind.assert(candidate, { 'b': 2 }), candidate);
  });
});
