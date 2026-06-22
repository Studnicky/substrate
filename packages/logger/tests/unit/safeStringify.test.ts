import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { safeStringify } from '../../src/modules/safeStringify.js';

void describe('safeStringify', () => {
  void it('stringifies simple objects', () => {
    const obj = {
      name: 'test',
      value: 42
    };
    const result = safeStringify(obj);

    assert.strictEqual(result, '{"name":"test","value":42}');
  });

  void it('stringifies arrays', () => {
    const arr = [
      1,
      2,
      3
    ];
    const result = safeStringify(arr);

    assert.strictEqual(result, '[1,2,3]');
  });

  void it('stringifies nested objects', () => {
    const obj = { level1: { level2: { level3: 'deep value' } } };
    const result = safeStringify(obj);

    assert.strictEqual(result, '{"level1":{"level2":{"level3":"deep value"}}}');
  });

  void it('handles null values', () => {
    const obj = { value: null };
    const result = safeStringify(obj);

    assert.strictEqual(result, '{"value":null}');
  });

  void it('handles undefined values', () => {
    const obj = { value: undefined };
    const result = safeStringify(obj);

    assert.strictEqual(result, '{}');
  });

  void it('handles circular references', () => {
    const obj: Record<string, unknown> = { name: 'test' };

    obj.self = obj;

    const result = safeStringify(obj);

    assert.ok(result.includes('"name":"test"'));
    assert.ok(result.includes('"self":"[Circular]"'));
  });

  void it('handles multiple circular references', () => {
    const obj1: Record<string, unknown> = { name: 'obj1' };
    const obj2: Record<string, unknown> = { name: 'obj2' };

    obj1.ref = obj2;
    obj2.ref = obj1;

    const result = safeStringify({
      obj1,
      obj2
    });

    assert.ok(result.includes('"name":"obj1"'));
    assert.ok(result.includes('"name":"obj2"'));
    assert.ok(result.includes('[Circular]'));
  });

  void it('handles circular references in arrays', () => {
    const arr: unknown[] = ['value'];

    arr.push(arr);

    const result = safeStringify(arr);

    assert.strictEqual(result, '["value","[Circular]"]');
  });

  void it('handles deeply nested circular references', () => {
    const obj: Record<string, unknown> = { level1: { level2: { level3: { value: 'deep' } } } };

    (obj.level1 as Record<string, unknown>).circularRef = obj;

    const result = safeStringify(obj);

    assert.ok(result.includes('"value":"deep"'));
    assert.ok(result.includes('"circularRef":"[Circular]"'));
  });

  void it('handles objects with various data types', () => {
    const obj = {
      array: [
        1,
        2,
        3
      ],
      boolean: true,
      nested: { key: 'value' },
      nullValue: null,
      number: 42,
      string: 'text'
    };

    const result = safeStringify(obj);
    const parsed = JSON.parse(result) as Record<string, unknown>;

    assert.strictEqual(parsed.string, 'text');
    assert.strictEqual(parsed.number, 42);
    assert.strictEqual(parsed.boolean, true);
    assert.strictEqual(parsed.nullValue, null);
    assert.deepStrictEqual(parsed.array, [
      1,
      2,
      3
    ]);
    assert.deepStrictEqual(parsed.nested, { key: 'value' });
  });

  void it('handles Date objects', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const obj = { timestamp: date };

    const result = safeStringify(obj);

    assert.ok(result.includes('2024-01-01T00:00:00.000Z'));
  });

  void it('handles primitive values', () => {
    assert.strictEqual(safeStringify('string'), '"string"');
    assert.strictEqual(safeStringify(42), '42');
    assert.strictEqual(safeStringify(true), 'true');
    assert.strictEqual(safeStringify(null), 'null');
  });

  void it('handles empty objects and arrays', () => {
    assert.strictEqual(safeStringify({}), '{}');
    assert.strictEqual(safeStringify([]), '[]');
  });

  void it('handles objects with symbols (symbols are skipped)', () => {
    const sym = Symbol('test');
    const obj = {
      regular: 'regular value',
      [sym]: 'symbol value'
    };

    const result = safeStringify(obj);

    assert.strictEqual(result, '{"regular":"regular value"}');
  });
});
