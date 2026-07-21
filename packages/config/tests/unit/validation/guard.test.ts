import { Guard } from '@studnicky/types';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

void describe('Guard', () => {
  void describe('isObject', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for a plain object', input: { a: 1 }, expected: true },
      { description: 'returns false for null', input: null, expected: false },
      { description: 'returns false for an array', input: [1, 2], expected: false },
      { description: 'returns false for a string', input: 'hello', expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isObject(input), expected);
      });
    }
  });

  void describe('isString', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for a string', input: 'hello', expected: true },
      { description: 'returns false for a number', input: 42, expected: false },
      { description: 'returns false for undefined', input: undefined, expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isString(input), expected);
      });
    }
  });

  void describe('isNumber', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for a finite number', input: 42, expected: true },
      { description: 'returns false for NaN', input: NaN, expected: false },
      { description: 'returns false for a string', input: '42', expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isNumber(input), expected);
      });
    }
  });

  void describe('asNumber', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: number | undefined }> = [
      { description: 'returns number for a number value', input: 7, expected: 7 },
      { description: 'returns undefined for a non-number', input: 'seven', expected: undefined },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.asNumber(input), expected);
      });
    }
  });

  void describe('isBoolean', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for true', input: true, expected: true },
      { description: 'returns true for false', input: false, expected: true },
      { description: 'returns false for a string', input: 'true', expected: false },
      { description: 'returns false for 0', input: 0, expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isBoolean(input), expected);
      });
    }
  });

  void describe('isFunction', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for an arrow function', input: () => {}, expected: true },
      { description: 'returns true for a named function', input: function named() {}, expected: true },
      { description: 'returns false for an object', input: {}, expected: false },
      { description: 'returns false for null', input: null, expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isFunction(input), expected);
      });
    }
  });

  void describe('asStringOrNull', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: string | null | undefined }> = [
      { description: 'returns null for null', input: null, expected: null },
      { description: 'returns string for a string value', input: 'hello', expected: 'hello' },
      { description: 'returns undefined for a number', input: 42, expected: undefined },
      { description: 'returns undefined for undefined', input: undefined, expected: undefined },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.asStringOrNull(input), expected);
      });
    }
  });

  void describe('asRecordArray', () => {
    void it('returns filtered array of records from a mixed array', () => {
      const result = Guard.asRecordArray([{ a: 1 }, 'skip', null, { b: 2 }]);
      assert.deepStrictEqual(result, [{ a: 1 }, { b: 2 }]);
    });

    void it('returns undefined for a non-array', () => {
      assert.strictEqual(Guard.asRecordArray({ a: 1 }), undefined);
    });

    void it('returns undefined when no records are in the array', () => {
      assert.strictEqual(Guard.asRecordArray(['a', null, 42]), undefined);
    });
  });

  void describe('isNonNegativeInteger', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for 0', input: 0, expected: true },
      { description: 'returns true for a positive integer', input: 1, expected: true },
      { description: 'returns false for -1', input: -1, expected: false },
      { description: 'returns false for a float', input: 0.5, expected: false },
      { description: 'returns false for a string', input: '1', expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isNonNegativeInteger(input), expected);
      });
    }
  });

  void describe('isPositiveInteger', () => {
    const scenarios: Array<{ description: string; input: unknown; expected: boolean }> = [
      { description: 'returns true for 1', input: 1, expected: true },
      { description: 'returns false for 0', input: 0, expected: false },
      { description: 'returns false for -1', input: -1, expected: false },
      { description: 'returns false for a float', input: 1.5, expected: false },
      { description: 'returns false for a string', input: '1', expected: false },
    ];

    for (const { description, input, expected } of scenarios) {
      void it(description, () => {
        assert.strictEqual(Guard.isPositiveInteger(input), expected);
      });
    }
  });
});
