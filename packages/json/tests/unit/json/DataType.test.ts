import assert from 'node:assert';
import { describe, it } from 'node:test';

import { DataType } from '../../../src/json/DataType.js';

void describe('DataType', () => {
  void describe('DataType.deepEqual', () => {
    void it('returns true for identical primitives', () => {
      assert.ok(DataType.deepEqual(1, 1));
      assert.ok(DataType.deepEqual('a', 'a'));
      assert.ok(DataType.deepEqual(true, true));
      assert.ok(DataType.deepEqual(null, null));
    });

    void it('returns false for differing primitives', () => {
      assert.ok(!DataType.deepEqual(1, 2));
      assert.ok(!DataType.deepEqual('a', 'b'));
      assert.ok(!DataType.deepEqual(null, undefined));
    });

    void it('treats NaN as equal to NaN', () => {
      assert.ok(DataType.deepEqual(NaN, NaN));
    });

    void it('compares arrays element-wise', () => {
      assert.ok(DataType.deepEqual([1, 2, 3], [1, 2, 3]));
      assert.ok(!DataType.deepEqual([1, 2], [1, 2, 3]));
      assert.ok(!DataType.deepEqual([1, 2, 4], [1, 2, 3]));
    });

    void it('compares plain objects key-wise', () => {
      assert.ok(DataType.deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }));
      assert.ok(!DataType.deepEqual({ a: 1 }, { a: 2 }));
      assert.ok(!DataType.deepEqual({ a: 1 }, { a: 1, b: 2 }));
    });

    void it('compares nested objects', () => {
      assert.ok(DataType.deepEqual({ a: { b: 1 } }, { a: { b: 1 } }));
      assert.ok(!DataType.deepEqual({ a: { b: 1 } }, { a: { b: 2 } }));
    });

    void it('compares Date objects by time value', () => {
      const d1 = new Date('2024-01-01');
      const d2 = new Date('2024-01-01');
      const d3 = new Date('2024-01-02');

      assert.ok(DataType.deepEqual(d1, d2));
      assert.ok(!DataType.deepEqual(d1, d3));
    });

    void it('compares RegExp by string representation', () => {
      assert.ok(DataType.deepEqual(/abc/u, /abc/u));
      assert.ok(!DataType.deepEqual(/abc/u, /def/u));
    });

    void it('compares Sets by primitive membership', () => {
      assert.ok(DataType.deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3])));
      assert.ok(!DataType.deepEqual(new Set([1, 2]), new Set([1, 2, 3])));
    });

    void it('compares Maps by key-value pairs', () => {
      const m1 = new Map([['a', 1], ['b', 2]]);
      const m2 = new Map([['a', 1], ['b', 2]]);
      const m3 = new Map([['a', 1], ['b', 3]]);

      assert.ok(DataType.deepEqual(m1, m2));
      assert.ok(!DataType.deepEqual(m1, m3));
    });

    void it('returns false for mixed types', () => {
      assert.ok(!DataType.deepEqual([], {}));
      assert.ok(!DataType.deepEqual(new Date(), {}));
      assert.ok(!DataType.deepEqual(new Set(), new Map()));
    });
  });

  void describe('DataType.isPlainObject', () => {
    void it('returns true for plain objects', () => {
      assert.ok(DataType.isPlainObject({}));
      assert.ok(DataType.isPlainObject({ a: 1 }));
      assert.ok(DataType.isPlainObject(Object.create(null)));
    });

    void it('returns false for non-plain objects', () => {
      assert.ok(!DataType.isPlainObject([]));
      assert.ok(!DataType.isPlainObject(null));
      assert.ok(!DataType.isPlainObject(new Date()));
      assert.ok(!DataType.isPlainObject('string'));
    });
  });

  void describe('DataType.isRecord', () => {
    void it('returns true for objects', () => {
      assert.ok(DataType.isRecord({}));
      assert.ok(DataType.isRecord(new Map()));
    });

    void it('returns false for arrays and nulls', () => {
      assert.ok(!DataType.isRecord([]));
      assert.ok(!DataType.isRecord(null));
    });
  });

  void describe('DataType.hasCycle', () => {
    void it('returns false for acyclic values', () => {
      assert.ok(!DataType.hasCycle({ a: 1, b: [2, 3] }));
      assert.ok(!DataType.hasCycle([1, { x: 2 }]));
    });

    void it('returns true for cyclic objects', () => {
      const obj: Record<string, unknown> = { a: 1 };

      obj['self'] = obj;
      assert.ok(DataType.hasCycle(obj));
    });

    void it('returns true for cyclic arrays', () => {
      const arr: unknown[] = [1, 2];

      arr.push(arr);
      assert.ok(DataType.hasCycle(arr));
    });
  });
});
