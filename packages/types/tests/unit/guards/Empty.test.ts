import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Empty } from '../../../src/guards/Empty.js';

// Empty.string
void it('Empty.string returns an empty string', () => { assert.strictEqual(Empty.string(), ''); });

// Empty.object
void it('Empty.object returns a fresh plain object with no keys', () => {
  const result = Empty.object();
  assert.deepEqual(result, {});
  assert.equal(Object.keys(result).length, 0);
});

void it('Empty.object returns a new instance on each call', () => {
  assert.notStrictEqual(Empty.object(), Empty.object());
});

// Empty.array
void it('Empty.array returns a fresh empty array', () => {
  const result = Empty.array<number>();
  assert.ok(Array.isArray(result));
  assert.equal(result.length, 0);
});

void it('Empty.array returns a new instance on each call', () => {
  assert.notStrictEqual(Empty.array(), Empty.array());
});

// Empty.map
void it('Empty.map returns a fresh empty Map', () => {
  const result = Empty.map<string, number>();
  assert.ok(result instanceof Map);
  assert.equal(result.size, 0);
});

void it('Empty.map returns a new instance on each call', () => {
  assert.notStrictEqual(Empty.map(), Empty.map());
});

// Empty.set
void it('Empty.set returns a fresh empty Set', () => {
  const result = Empty.set<string>();
  assert.ok(result instanceof Set);
  assert.equal(result.size, 0);
});

void it('Empty.set returns a new instance on each call', () => {
  assert.notStrictEqual(Empty.set(), Empty.set());
});

// Empty.isString
const isStringScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Empty.isString returns true for empty string', value: '', expected: true },
  { description: 'Empty.isString returns false for non-empty string', value: 'a', expected: false },
  { description: 'Empty.isString returns false for number', value: 0, expected: false },
  { description: 'Empty.isString returns false for null', value: null, expected: false },
  { description: 'Empty.isString returns false for undefined', value: undefined, expected: false },
  { description: 'Empty.isString returns false for boolean false', value: false, expected: false },
];
for (const { description, value, expected } of isStringScenarios) {
  void it(description, () => { assert.equal(Empty.isString(value), expected); });
}

// Empty.isObject
const isObjectScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Empty.isObject returns true for empty plain object', value: {}, expected: true },
  { description: 'Empty.isObject returns false for non-empty plain object', value: { a: 1 }, expected: false },
  { description: 'Empty.isObject returns false for null', value: null, expected: false },
  { description: 'Empty.isObject returns false for array', value: [], expected: false },
  { description: 'Empty.isObject returns false for empty Map', value: new Map(), expected: false },
  { description: 'Empty.isObject returns false for empty Set', value: new Set(), expected: false },
  { description: 'Empty.isObject returns false for string', value: '', expected: false },
  { description: 'Empty.isObject returns false for number', value: 0, expected: false },
];
for (const { description, value, expected } of isObjectScenarios) {
  void it(description, () => { assert.equal(Empty.isObject(value), expected); });
}

// Empty.isArray
const isArrayScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Empty.isArray returns true for empty array', value: [], expected: true },
  { description: 'Empty.isArray returns false for non-empty array', value: [1], expected: false },
  { description: 'Empty.isArray returns false for plain object', value: {}, expected: false },
  { description: 'Empty.isArray returns false for null', value: null, expected: false },
  { description: 'Empty.isArray returns false for string', value: '', expected: false },
];
for (const { description, value, expected } of isArrayScenarios) {
  void it(description, () => { assert.equal(Empty.isArray(value), expected); });
}

// Empty.isMap
const isMapScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Empty.isMap returns true for empty Map', value: new Map(), expected: true },
  { description: 'Empty.isMap returns false for non-empty Map', value: new Map([['a', 1]]), expected: false },
  { description: 'Empty.isMap returns false for plain object', value: {}, expected: false },
  { description: 'Empty.isMap returns false for null', value: null, expected: false },
  { description: 'Empty.isMap returns false for empty Set', value: new Set(), expected: false },
];
for (const { description, value, expected } of isMapScenarios) {
  void it(description, () => { assert.equal(Empty.isMap(value), expected); });
}

// Empty.isSet
const isSetScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Empty.isSet returns true for empty Set', value: new Set(), expected: true },
  { description: 'Empty.isSet returns false for non-empty Set', value: new Set([1]), expected: false },
  { description: 'Empty.isSet returns false for plain object', value: {}, expected: false },
  { description: 'Empty.isSet returns false for null', value: null, expected: false },
  { description: 'Empty.isSet returns false for empty Map', value: new Map(), expected: false },
];
for (const { description, value, expected } of isSetScenarios) {
  void it(description, () => { assert.equal(Empty.isSet(value), expected); });
}
