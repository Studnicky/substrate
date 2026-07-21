import assert from 'node:assert/strict';
import { it } from 'node:test';

import { JsonValue } from '../../../src/guards/JsonValue.js';

void it('JsonValue.is accepts nested JSON data', () => {
  assert.equal(JsonValue.is({ 'nested': [1, 'two', null, true] }), true);
});

void it('JsonValue.is rejects non-JSON data', () => {
  assert.equal(JsonValue.is({ 'value': undefined }), false);
});

void it('JsonValue.is rejects class instances', () => {
  assert.equal(JsonValue.is(new Date(0)), false);
});

void it('JsonValue.is rejects cyclic data', () => {
  const value: Record<string, unknown> = {};
  value.self = value;
  assert.equal(JsonValue.is(value), false);
});

// Primitives pass through
void it('JsonValue.from passes null through', () => {
  assert.strictEqual(JsonValue.from(null), null);
});

void it('JsonValue.from passes a string through', () => {
  assert.strictEqual(JsonValue.from('hello'), 'hello');
});

void it('JsonValue.from passes a number through', () => {
  assert.strictEqual(JsonValue.from(42), 42);
});

void it('JsonValue.from passes boolean true through', () => {
  assert.strictEqual(JsonValue.from(true), true);
});

void it('JsonValue.from passes boolean false through', () => {
  assert.strictEqual(JsonValue.from(false), false);
});

// Arrays recurse
void it('JsonValue.from coerces a flat array element-wise', () => {
  assert.deepEqual(JsonValue.from([1, 'two', null, true]), [1, 'two', null, true]);
});

void it('JsonValue.from coerces non-JSON elements inside an array to null', () => {
  assert.deepEqual(JsonValue.from([undefined, () => { return 1; }, Symbol('s')]), [null, null, null]);
});

void it('JsonValue.from recurses nested arrays', () => {
  assert.deepEqual(JsonValue.from([[1, 2], [3, 4]]), [[1, 2], [3, 4]]);
});

void it('JsonValue.from replaces a cyclic branch with null', () => {
  const value: Record<string, unknown> = {};
  value.self = value;
  assert.deepEqual(JsonValue.from(value), { 'self': null });
});

void it('JsonValue.from replaces class instances with null', () => {
  assert.equal(JsonValue.from(new Date(0)), null);
});

// Plain objects recurse field-wise
void it('JsonValue.from coerces a flat plain object field-wise', () => {
  assert.deepEqual(JsonValue.from({ a: 1, b: 'two' }), { a: 1, b: 'two' });
});

void it('JsonValue.from recurses nested plain objects', () => {
  assert.deepEqual(
    JsonValue.from({ outer: { inner: 42 } }),
    { outer: { inner: 42 } }
  );
});

void it('JsonValue.from coerces non-JSON fields in an object to null', () => {
  assert.deepEqual(
    JsonValue.from({ fn: () => { return 0; }, sym: Symbol('x'), n: 1 }),
    { fn: null, sym: null, n: 1 }
  );
});

// Non-JSON scalars become null
const nonJsonScenarios: Array<{ description: string; value: unknown }> = [
  { description: 'JsonValue.from coerces undefined to null', value: undefined },
  { description: 'JsonValue.from coerces a function to null', value: () => { return 0; } },
  { description: 'JsonValue.from coerces a symbol to null', value: Symbol('s') },
  { description: 'JsonValue.from coerces a bigint to null', value: 9007199254740993n },
  { description: 'JsonValue.from coerces NaN to null', value: Number.NaN },
  { description: 'JsonValue.from coerces Infinity to null', value: Number.POSITIVE_INFINITY },
  { description: 'JsonValue.from coerces -Infinity to null', value: Number.NEGATIVE_INFINITY }
];

for (const { description, value } of nonJsonScenarios) {
  void it(description, () => { assert.strictEqual(JsonValue.from(value), null); });
}
