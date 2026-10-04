import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '../../src/index.js';

void describe('Predicates subclass override', () => {
  class LaxPredicates extends Predicates {
    public static override isObject<T>(value: T): value is Record<string, unknown> & T {
      const result = typeof value === 'object' && value !== null;
      return result;
    }
  }

  void it('overridden isObject accepts arrays', () => {
    assert.equal(LaxPredicates.isObject([1, 2, 3]), true);
    assert.equal(LaxPredicates.isObject(null), false);
    assert.equal(LaxPredicates.isObject({}), true);
  });

  void it('asRecordArray delegates through overridden isObject — nested arrays pass filter', () => {
    const input: unknown[] = [[1, 2], { 'a': 1 }, 'skip-me', null];
    const result = LaxPredicates.asRecordArray(input);

    assert.ok(result !== undefined);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], [1, 2]);
    assert.deepEqual(result[1], { 'a': 1 });
  });

  void it('base Predicates.isObject is unchanged — arrays are not records', () => {
    assert.equal(Predicates.isObject([1, 2, 3]), false);
  });
});
