import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Wire } from '../../../src/guards/Wire.js';

void describe('Wire', () => {
  void describe('Wire.isRecord', () => {
    void it('returns true for plain objects', () => {
      assert.equal(Wire.isRecord({ a: 1 }), true);
      assert.equal(Wire.isRecord({}), true);
    });

    void it('returns false for null', () => {
      assert.equal(Wire.isRecord(null), false);
    });

    void it('returns false for arrays', () => {
      assert.equal(Wire.isRecord([1, 2, 3]), false);
    });

    void it('returns false for primitives', () => {
      assert.equal(Wire.isRecord('string'), false);
      assert.equal(Wire.isRecord(42), false);
      assert.equal(Wire.isRecord(true), false);
      assert.equal(Wire.isRecord(undefined), false);
    });
  });

  void describe('Wire.asRecord', () => {
    void it('returns the value when it is a record', () => {
      const obj = { key: 'value' };
      assert.strictEqual(Wire.asRecord(obj), obj);
    });

    void it('returns undefined for non-record values', () => {
      assert.strictEqual(Wire.asRecord(null), undefined);
      assert.strictEqual(Wire.asRecord([]), undefined);
      assert.strictEqual(Wire.asRecord('text'), undefined);
      assert.strictEqual(Wire.asRecord(0), undefined);
    });
  });

  void describe('Wire.asString', () => {
    void it('returns the string when value is a string', () => {
      assert.strictEqual(Wire.asString('hello'), 'hello');
      assert.strictEqual(Wire.asString(''), '');
    });

    void it('returns undefined for non-string values', () => {
      assert.strictEqual(Wire.asString(42), undefined);
      assert.strictEqual(Wire.asString(null), undefined);
      assert.strictEqual(Wire.asString(true), undefined);
      assert.strictEqual(Wire.asString(undefined), undefined);
    });
  });

  void describe('Wire.asNumber', () => {
    void it('returns the number when value is a number', () => {
      assert.strictEqual(Wire.asNumber(42), 42);
      assert.strictEqual(Wire.asNumber(0), 0);
      assert.strictEqual(Wire.asNumber(-1.5), -1.5);
    });

    void it('returns undefined for non-number values', () => {
      assert.strictEqual(Wire.asNumber('42'), undefined);
      assert.strictEqual(Wire.asNumber(null), undefined);
      assert.strictEqual(Wire.asNumber(true), undefined);
    });
  });

  void describe('Wire.asStringOrNull', () => {
    void it('returns the string when value is a string', () => {
      assert.strictEqual(Wire.asStringOrNull('hello'), 'hello');
    });

    void it('returns null when value is null', () => {
      assert.strictEqual(Wire.asStringOrNull(null), null);
    });

    void it('returns undefined for other non-string values', () => {
      assert.strictEqual(Wire.asStringOrNull(42), undefined);
      assert.strictEqual(Wire.asStringOrNull(true), undefined);
      assert.strictEqual(Wire.asStringOrNull(undefined), undefined);
      assert.strictEqual(Wire.asStringOrNull({}), undefined);
    });
  });

  void describe('Wire.asRecordArray', () => {
    void it('returns filtered records from an array', () => {
      const input = [{ a: 1 }, 'string', { b: 2 }, null, 42];
      const result = Wire.asRecordArray(input);

      assert.ok(result !== undefined);
      assert.equal(result.length, 2);
      assert.deepEqual(result[0], { a: 1 });
      assert.deepEqual(result[1], { b: 2 });
    });

    void it('returns undefined for non-array input', () => {
      assert.strictEqual(Wire.asRecordArray({ a: 1 }), undefined);
      assert.strictEqual(Wire.asRecordArray('string'), undefined);
      assert.strictEqual(Wire.asRecordArray(null), undefined);
    });

    void it('returns undefined when no records found in array', () => {
      assert.strictEqual(Wire.asRecordArray([1, 2, 'str', null]), undefined);
      assert.strictEqual(Wire.asRecordArray([]), undefined);
    });

    void it('returns all elements when all are records', () => {
      const input = [{ x: 1 }, { y: 2 }, { z: 3 }];
      const result = Wire.asRecordArray(input);

      assert.ok(result !== undefined);
      assert.equal(result.length, 3);
    });
  });
});
