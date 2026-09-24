import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Invariant } from '../../../src/types/Invariant.js';

interface RangeFixtureInterface {
  'max': number;
  'min': number;
}

void describe('Invariant', () => {
  const minLessThanMax = Invariant.define<RangeFixtureInterface>(
    'minLessThanMax',
    (value) => (value.min < value.max ? undefined : 'min must be less than max'),
    '/min'
  );

  void it('carries its name and JSON Pointer location', () => {
    assert.equal(minLessThanMax.name, 'minLessThanMax');
    assert.equal(minLessThanMax.pointer, '/min');
  });

  void it('returns undefined when the invariant holds', () => {
    const result = Invariant.run(minLessThanMax, { 'max': 10, 'min': 1 });

    assert.equal(result, undefined);
  });

  void it('returns the error message when the invariant is violated', () => {
    const result = Invariant.run(minLessThanMax, { 'max': 1, 'min': 10 });

    assert.equal(result, 'min must be less than max');
  });

  void it('defaults the pointer to the schema root', () => {
    const rootInvariant = Invariant.define<number>('positive', (value) => (value > 0 ? undefined : 'must be positive'));

    assert.equal(rootInvariant.pointer, '');
  });
});
