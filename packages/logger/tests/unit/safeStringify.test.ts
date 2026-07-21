import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { SafeStringify } from '../../src/modules/safeStringify.js';

void describe('safeStringify', () => {
  void it('stringifies simple objects', () => {
    const obj = {
      name: 'test',
      value: 42
    };
    const result = SafeStringify.stringify(obj);

    assert.strictEqual(result, '{"name":"test","value":42}');
  });

  void it('stringifies arrays', () => {
    const arr = [
      1,
      2,
      3
    ];
    const result = SafeStringify.stringify(arr);

    assert.strictEqual(result, '[1,2,3]');
  });

  void it('stringifies nested objects', () => {
    const obj = { level1: { level2: { level3: 'deep value' } } };
    const result = SafeStringify.stringify(obj);

    assert.strictEqual(result, '{"level1":{"level2":{"level3":"deep value"}}}');
  });

  void it('handles null values', () => {
    const obj = { value: null };
    const result = SafeStringify.stringify(obj);

    assert.strictEqual(result, '{"value":null}');
  });

  void it('handles undefined values', () => {
    const obj = { value: undefined };
    const result = SafeStringify.stringify(obj);

    assert.strictEqual(result, '{}');
  });

  void it('handles circular references', () => {
    const obj: Record<string, unknown> = { name: 'test' };

    obj.self = obj;

    const result = SafeStringify.stringify(obj);

    assert.ok(result.includes('"name":"test"'));
    assert.ok(result.includes('"self":"[Circular]"'));
  });

  void it('handles multiple circular references', () => {
    const obj1: Record<string, unknown> = { name: 'obj1' };
    const obj2: Record<string, unknown> = { name: 'obj2' };

    obj1.ref = obj2;
    obj2.ref = obj1;

    const result = SafeStringify.stringify({
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

    const result = SafeStringify.stringify(arr);

    assert.strictEqual(result, '["value","[Circular]"]');
  });

  void it('handles deeply nested circular references', () => {
    const level1: Record<string, unknown> = { level2: { level3: { value: 'deep' } } };
    const obj: Record<string, unknown> = { level1 };
    level1.circularRef = obj;

    const result = SafeStringify.stringify(obj);

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

    const result = SafeStringify.stringify(obj);
    const parsed: unknown = JSON.parse(result);

    assert.deepStrictEqual(parsed, obj);
  });

  void it('handles Date objects', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const obj = { timestamp: date };

    const result = SafeStringify.stringify(obj);

    assert.ok(result.includes('2024-01-01T00:00:00.000Z'));
  });

  void it('handles primitive values', () => {
    assert.strictEqual(SafeStringify.stringify('string'), '"string"');
    assert.strictEqual(SafeStringify.stringify(42), '42');
    assert.strictEqual(SafeStringify.stringify(true), 'true');
    assert.strictEqual(SafeStringify.stringify(null), 'null');
  });

  void it('handles empty objects and arrays', () => {
    assert.strictEqual(SafeStringify.stringify({}), '{}');
    assert.strictEqual(SafeStringify.stringify([]), '[]');
  });

  void it('handles objects with symbols (symbols are skipped)', () => {
    const sym = Symbol('test');
    const obj = {
      regular: 'regular value',
      [sym]: 'symbol value'
    };

    const result = SafeStringify.stringify(obj);

    assert.strictEqual(result, '{"regular":"regular value"}');
  });
});
