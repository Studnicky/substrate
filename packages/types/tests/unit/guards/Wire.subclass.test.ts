import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Wire } from '../../../src/guards/Wire.js';

/**
 * Subclass extension test — `LaxWire` static overrides `isRecord` to treat
 * arrays as records, proving that `asRecord` and `asRecordArray` both reflect
 * the override via `this.isRecord` dispatch.
 */
class LaxWire extends Wire {
  /** Override: arrays also count as records. */
  public static override isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}

void describe('Wire subclass extension', () => {
  void it('overridden isRecord accepts arrays', () => {
    assert.equal(LaxWire.isRecord([1, 2, 3]), true);
    assert.equal(LaxWire.isRecord(null), false);
    assert.equal(LaxWire.isRecord({}), true);
  });

  void it('asRecord delegates through overridden isRecord — arrays become records', () => {
    const arr = [1, 2, 3];
    const result = LaxWire.asRecord(arr);

    // The override treats arrays as records, so asRecord returns the array
    assert.strictEqual(result, arr);
  });

  void it('asRecordArray delegates through overridden isRecord — nested arrays pass filter', () => {
    const input: unknown[] = [[1, 2], { a: 1 }, 'skip-me', null];
    const result = LaxWire.asRecordArray(input);

    // LaxWire treats both [1, 2] and { a: 1 } as records; 'skip-me' and null are not objects
    assert.ok(result !== undefined);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], [1, 2]);
    assert.deepEqual(result[1], { a: 1 });
  });

  void it('base Wire.isRecord is unchanged — arrays are not records', () => {
    assert.equal(Wire.isRecord([1, 2, 3]), false);
  });
});
