import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Invariant } from '../../../src/types/Invariant.js';

void describe('Invariant', () => {
  const minimumLessThanMaximum = Invariant.define<{ 'maximum': number; 'minimum': number }>(
    'minimumLessThanMaximum',
    (value) => {
      const message = value.minimum < value.maximum ? undefined : 'minimum must be less than maximum';
      return message;
    },
    '/minimum'
  );

  void it('carries its name and JSON Pointer location', () => {
    assert.equal(minimumLessThanMaximum.name, 'minimumLessThanMaximum');
    assert.equal(minimumLessThanMaximum.pointer, '/minimum');
  });

  void it('returns undefined when the invariant holds', () => {
    const result = Invariant.run(minimumLessThanMaximum, { 'maximum': 10, 'minimum': 1 });

    assert.equal(result, undefined);
  });

  void it('returns the error message when the invariant is violated', () => {
    const result = Invariant.run(minimumLessThanMaximum, { 'maximum': 1, 'minimum': 10 });

    assert.equal(result, 'minimum must be less than maximum');
  });

  void it('defaults the pointer to the schema root', () => {
    const rootInvariant = Invariant.define<number>('positive', (value) => {
      const message = value > 0 ? undefined : 'must be positive';
      return message;
    });

    assert.equal(rootInvariant.pointer, '');
  });
});
