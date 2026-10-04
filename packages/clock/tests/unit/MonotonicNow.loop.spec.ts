import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClockError } from '../../src/errors/ClockError.js';
import { MonotonicNow } from '../../src/monotonic-now/MonotonicNow.js';

void describe('MonotonicNow', () => {
  void it('rejects a non-callable source', () => {
    assert.throws(() => { MonotonicNow.create(0); }, ClockError);
  });

  void it('wraps a throwing source with ClockError', () => {
    const cause = RuntimeError.create('source failure');
    const clock = MonotonicNow.create((): number => { throw cause; });
    assert.throws(() => { clock(); }, (error: Error): boolean => {
      const result = error instanceof ClockError && error.cause === cause;
      return result;
    });
  });

  void it('rejects non-finite source readings', () => {
    const invalidReadings: readonly number[] = [Number.NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY];
    for (let index = 0; index < invalidReadings.length; index += 1) {
      const reading = invalidReadings[index] ?? Number.NaN;
      const clock = MonotonicNow.create((): number => { return reading; });
      assert.throws(() => { clock(); }, ClockError);
    }
  });

  void it('rejects readings that move backwards', () => {
    let reading = 2;
    const clock = MonotonicNow.create((): number => { return reading; });
    assert.equal(clock(), 2);
    reading = 1;
    assert.throws(() => { clock(); }, ClockError);
  });
});
