import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TypeGuards } from '../../../src/validation/typeGuards.js';

void describe('typeGuards', () => {
  void describe('isObject', () => {
    void it('returns true for a plain object', () => {
      assert.strictEqual(TypeGuards.isObject({}), true);
    });

    void it('returns true for an object with properties', () => {
      assert.strictEqual(TypeGuards.isObject({ a: 1 }), true);
    });

    void it('returns false for null', () => {
      assert.strictEqual(TypeGuards.isObject(null), false);
    });

    void it('returns false for a string', () => {
      assert.strictEqual(TypeGuards.isObject('hello'), false);
    });

    void it('returns false for a number', () => {
      assert.strictEqual(TypeGuards.isObject(42), false);
    });

    void it('returns true for an array (arrays are objects)', () => {
      assert.strictEqual(TypeGuards.isObject([]), true);
    });
  });

  void describe('isFunction', () => {
    void it('returns true for a function', () => {
      assert.strictEqual(TypeGuards.isFunction(() => {}), true);
    });

    void it('returns true for a named function', () => {
      function named() {}
      assert.strictEqual(TypeGuards.isFunction(named), true);
    });

    void it('returns false for a non-function', () => {
      assert.strictEqual(TypeGuards.isFunction(42), false);
    });

    void it('returns false for an object', () => {
      assert.strictEqual(TypeGuards.isFunction({}), false);
    });
  });

  void describe('isNonNegativeInteger', () => {
    void it('returns true for 0', () => {
      assert.strictEqual(TypeGuards.isNonNegativeInteger(0), true);
    });

    void it('returns true for a positive integer', () => {
      assert.strictEqual(TypeGuards.isNonNegativeInteger(5), true);
    });

    void it('returns false for a float', () => {
      assert.strictEqual(TypeGuards.isNonNegativeInteger(1.5), false);
    });

    void it('returns false for a negative integer', () => {
      assert.strictEqual(TypeGuards.isNonNegativeInteger(-1), false);
    });

    void it('returns false for a string', () => {
      assert.strictEqual(TypeGuards.isNonNegativeInteger('5'), false);
    });
  });

  void describe('isPositiveInteger', () => {
    void it('returns true for 1', () => {
      assert.strictEqual(TypeGuards.isPositiveInteger(1), true);
    });

    void it('returns false for 0', () => {
      assert.strictEqual(TypeGuards.isPositiveInteger(0), false);
    });

    void it('returns false for a negative integer', () => {
      assert.strictEqual(TypeGuards.isPositiveInteger(-3), false);
    });

    void it('returns false for a float', () => {
      assert.strictEqual(TypeGuards.isPositiveInteger(2.5), false);
    });
  });
});
