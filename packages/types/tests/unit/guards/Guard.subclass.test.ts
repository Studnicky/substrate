import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Guard } from '../../../src/guards/Guard.js';

/**
 * Subclass extension test — `LaxGuard` static overrides `isObject` to treat
 * arrays as records, proving that `asRecord` and `asRecordArray` both reflect
 * the override via `this.isObject` dispatch.
 */
class LaxGuard extends Guard {
  /** Override: arrays also count as records. */
  public static override isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

void it('overridden isObject accepts arrays', () => {
  assert.equal(LaxGuard.isObject([1, 2, 3]), true);
  assert.equal(LaxGuard.isObject(null), false);
  assert.equal(LaxGuard.isObject({}), true);
});

void it('asRecord delegates through overridden isObject — arrays become records', () => {
  const arr = [1, 2, 3];
  const result = LaxGuard.asRecord(arr);

  // The override treats arrays as records, so asRecord returns the array
  assert.strictEqual(result, arr);
});

void it('asRecordArray delegates through overridden isObject — nested arrays pass filter', () => {
  const input: unknown[] = [[1, 2], { a: 1 }, 'skip-me', null];
  const result = LaxGuard.asRecordArray(input);

  // LaxGuard treats both [1, 2] and { a: 1 } as records; 'skip-me' and null are not objects
  assert.ok(result !== undefined);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], [1, 2]);
  assert.deepEqual(result[1], { a: 1 });
});

void it('base Guard.isObject is unchanged — arrays are not records', () => {
  assert.equal(Guard.isObject([1, 2, 3]), false);
});
