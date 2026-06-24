import assert from 'node:assert';
import { describe, it } from 'node:test';

import { DataType } from '../../../src/json/DataType.js';

void describe('DataType', () => {
  void describe('DataType.deepEqual', () => {
    const deepEqualTrueScenarios: Array<{ description: string; a: unknown; b: unknown }> = [
      { description: 'identical numbers are equal', a: 1, b: 1 },
      { description: 'identical strings are equal', a: 'a', b: 'a' },
      { description: 'identical booleans are equal', a: true, b: true },
      { description: 'null equals null', a: null, b: null },
    ];
    for (const { description, a, b } of deepEqualTrueScenarios) {
      void it(description, () => { assert.ok(DataType.deepEqual(a, b)); });
    }

    const deepEqualFalseScenarios: Array<{ description: string; a: unknown; b: unknown }> = [
      { description: '1 does not equal 2', a: 1, b: 2 },
      { description: '"a" does not equal "b"', a: 'a', b: 'b' },
      { description: 'null does not equal undefined', a: null, b: undefined },
    ];
    for (const { description, a, b } of deepEqualFalseScenarios) {
      void it(description, () => { assert.ok(!DataType.deepEqual(a, b)); });
    }

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
    const isPlainObjectTrueScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns true for empty object', input: {} },
      { description: 'returns true for object with properties', input: { a: 1 } },
      { description: 'returns true for null-prototype object', input: Object.create(null) },
    ];
    for (const { description, input } of isPlainObjectTrueScenarios) {
      void it(description, () => { assert.ok(DataType.isPlainObject(input)); });
    }

    const isPlainObjectFalseScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns false for array', input: [] },
      { description: 'returns false for null', input: null },
      { description: 'returns false for Date instance', input: new Date() },
      { description: 'returns false for string', input: 'string' },
    ];
    for (const { description, input } of isPlainObjectFalseScenarios) {
      void it(description, () => { assert.ok(!DataType.isPlainObject(input)); });
    }
  });

  void describe('DataType.isRecord', () => {
    const isRecordTrueScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns true for plain object', input: {} },
      { description: 'returns true for Map instance', input: new Map() },
    ];
    for (const { description, input } of isRecordTrueScenarios) {
      void it(description, () => { assert.ok(DataType.isRecord(input)); });
    }

    const isRecordFalseScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns false for array', input: [] },
      { description: 'returns false for null', input: null },
    ];
    for (const { description, input } of isRecordFalseScenarios) {
      void it(description, () => { assert.ok(!DataType.isRecord(input)); });
    }
  });

  void describe('DataType.hasCycle', () => {
    const hasCycleFalseScenarios: Array<{ description: string; input: unknown }> = [
      { description: 'returns false for acyclic object', input: { a: 1, b: [2, 3] } },
      { description: 'returns false for acyclic array', input: [1, { x: 2 }] },
    ];
    for (const { description, input } of hasCycleFalseScenarios) {
      void it(description, () => { assert.ok(!DataType.hasCycle(input)); });
    }

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
