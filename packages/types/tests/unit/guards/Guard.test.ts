import assert from 'node:assert/strict';
import { it } from 'node:test';

import { Guard } from '../../../src/guards/Guard.js';

// Guard.asNumber — truthy cases
const asNumberTruthyScenarios: Array<{ description: string; value: unknown; expected: number }> = [
  { description: 'Guard.asNumber returns the number for 42', value: 42, expected: 42 },
  { description: 'Guard.asNumber returns the number for 0', value: 0, expected: 0 },
  { description: 'Guard.asNumber returns the number for -1.5', value: -1.5, expected: -1.5 },
];
for (const { description, value, expected } of asNumberTruthyScenarios) {
  void it(description, () => { assert.strictEqual(Guard.asNumber(value), expected); });
}

// Guard.asNumber — undefined cases
const asNumberUndefinedScenarios: Array<{ description: string; value: unknown }> = [
  { description: 'Guard.asNumber returns undefined for string', value: '42' },
  { description: 'Guard.asNumber returns undefined for null', value: null },
  { description: 'Guard.asNumber returns undefined for boolean', value: true },
];
for (const { description, value } of asNumberUndefinedScenarios) {
  void it(description, () => { assert.strictEqual(Guard.asNumber(value), undefined); });
}

// Guard.asStringOrNull
void it('Guard.asStringOrNull returns the string when value is a string', () => {
  assert.strictEqual(Guard.asStringOrNull('hello'), 'hello');
});

void it('Guard.asStringOrNull returns null when value is null', () => {
  assert.strictEqual(Guard.asStringOrNull(null), null);
});

void it('Guard.asStringOrNull returns undefined for number', () => {
  assert.strictEqual(Guard.asStringOrNull(42), undefined);
});

void it('Guard.asStringOrNull returns undefined for boolean', () => {
  assert.strictEqual(Guard.asStringOrNull(true), undefined);
});

void it('Guard.asStringOrNull returns undefined for undefined', () => {
  assert.strictEqual(Guard.asStringOrNull(undefined), undefined);
});

void it('Guard.asStringOrNull returns undefined for object', () => {
  assert.strictEqual(Guard.asStringOrNull({}), undefined);
});

// Guard.asRecordArray
void it('Guard.asRecordArray returns filtered records from an array', () => {
  const input = [{ a: 1 }, 'string', { b: 2 }, null, 42];
  const result = Guard.asRecordArray(input);

  assert.ok(result !== undefined);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { a: 1 });
  assert.deepEqual(result[1], { b: 2 });
});

void it('Guard.asRecordArray returns undefined for non-array input (object)', () => {
  assert.strictEqual(Guard.asRecordArray({ a: 1 }), undefined);
});

void it('Guard.asRecordArray returns undefined for non-array input (string)', () => {
  assert.strictEqual(Guard.asRecordArray('string'), undefined);
});

void it('Guard.asRecordArray returns undefined for non-array input (null)', () => {
  assert.strictEqual(Guard.asRecordArray(null), undefined);
});

void it('Guard.asRecordArray returns undefined when no records found in array', () => {
  assert.strictEqual(Guard.asRecordArray([1, 2, 'str', null]), undefined);
});

void it('Guard.asRecordArray returns undefined for empty array', () => {
  assert.strictEqual(Guard.asRecordArray([]), undefined);
});

void it('Guard.asRecordArray returns all elements when all are records', () => {
  const input = [{ x: 1 }, { y: 2 }, { z: 3 }];
  const result = Guard.asRecordArray(input);

  assert.ok(result !== undefined);
  assert.equal(result.length, 3);
});

// Guard.isString
const isStringScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isString returns true for non-empty string', value: 'hello', expected: true },
  { description: 'Guard.isString returns true for empty string', value: '', expected: true },
  { description: 'Guard.isString returns false for number', value: 42, expected: false },
  { description: 'Guard.isString returns false for null', value: null, expected: false },
  { description: 'Guard.isString returns false for undefined', value: undefined, expected: false },
  { description: 'Guard.isString returns false for boolean', value: true, expected: false },
];
for (const { description, value, expected } of isStringScenarios) {
  void it(description, () => { assert.equal(Guard.isString(value), expected); });
}

// Guard.isNumber
const isNumberScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isNumber returns true for 42', value: 42, expected: true },
  { description: 'Guard.isNumber returns true for 0', value: 0, expected: true },
  { description: 'Guard.isNumber returns true for -1.5', value: -1.5, expected: true },
  { description: 'Guard.isNumber returns false for NaN', value: NaN, expected: false },
  { description: 'Guard.isNumber returns false for string', value: '42', expected: false },
  { description: 'Guard.isNumber returns false for null', value: null, expected: false },
  { description: 'Guard.isNumber returns false for boolean', value: true, expected: false },
];
for (const { description, value, expected } of isNumberScenarios) {
  void it(description, () => { assert.equal(Guard.isNumber(value), expected); });
}

// Guard.isBoolean
const isBooleanScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isBoolean returns true for true', value: true, expected: true },
  { description: 'Guard.isBoolean returns true for false', value: false, expected: true },
  { description: 'Guard.isBoolean returns false for number 1', value: 1, expected: false },
  { description: 'Guard.isBoolean returns false for string "true"', value: 'true', expected: false },
  { description: 'Guard.isBoolean returns false for null', value: null, expected: false },
];
for (const { description, value, expected } of isBooleanScenarios) {
  void it(description, () => { assert.equal(Guard.isBoolean(value), expected); });
}

// Guard.isFunction
const isFunctionScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isFunction returns true for arrow function', value: () => {}, expected: true },
  { description: 'Guard.isFunction returns true for named function', value: function named() {}, expected: true },
  { description: 'Guard.isFunction returns false for number', value: 42, expected: false },
  { description: 'Guard.isFunction returns false for object', value: {}, expected: false },
  { description: 'Guard.isFunction returns false for null', value: null, expected: false },
];
for (const { description, value, expected } of isFunctionScenarios) {
  void it(description, () => { assert.equal(Guard.isFunction(value), expected); });
}

// Guard.isObject
const isObjectScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isObject returns true for empty object', value: {}, expected: true },
  { description: 'Guard.isObject returns true for plain object', value: { a: 1 }, expected: true },
  { description: 'Guard.isObject returns false for null', value: null, expected: false },
  { description: 'Guard.isObject returns false for array', value: [], expected: false },
  { description: 'Guard.isObject returns false for string', value: 'hello', expected: false },
  { description: 'Guard.isObject returns false for number', value: 42, expected: false },
  { description: 'Guard.isObject returns false for boolean', value: true, expected: false },
  { description: 'Guard.isObject returns false for Map', value: new Map(), expected: false },
  { description: 'Guard.isObject returns false for non-empty Map', value: new Map([['a', 1]]), expected: false },
  { description: 'Guard.isObject returns false for Set', value: new Set(), expected: false },
  { description: 'Guard.isObject returns false for non-empty Set', value: new Set([1]), expected: false },
];
for (const { description, value, expected } of isObjectScenarios) {
  void it(description, () => { assert.equal(Guard.isObject(value), expected); });
}

// Guard.isNonNegativeInteger
const isNonNegativeIntegerScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isNonNegativeInteger returns true for 0', value: 0, expected: true },
  { description: 'Guard.isNonNegativeInteger returns true for positive integer', value: 5, expected: true },
  { description: 'Guard.isNonNegativeInteger returns false for float', value: 1.5, expected: false },
  { description: 'Guard.isNonNegativeInteger returns false for negative integer', value: -1, expected: false },
  { description: 'Guard.isNonNegativeInteger returns false for string', value: '5', expected: false },
];
for (const { description, value, expected } of isNonNegativeIntegerScenarios) {
  void it(description, () => { assert.equal(Guard.isNonNegativeInteger(value), expected); });
}

// Guard.isPositiveInteger
const isPositiveIntegerScenarios: Array<{ description: string; value: unknown; expected: boolean }> = [
  { description: 'Guard.isPositiveInteger returns true for 1', value: 1, expected: true },
  { description: 'Guard.isPositiveInteger returns false for 0', value: 0, expected: false },
  { description: 'Guard.isPositiveInteger returns false for negative integer', value: -3, expected: false },
  { description: 'Guard.isPositiveInteger returns false for float', value: 2.5, expected: false },
];
for (const { description, value, expected } of isPositiveIntegerScenarios) {
  void it(description, () => { assert.equal(Guard.isPositiveInteger(value), expected); });
}
