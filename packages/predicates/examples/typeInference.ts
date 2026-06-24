/** typeInference — inferValueType, isFiniteNumber, isIntegerValue, matchesType, matchesAnyType. Run: npx tsx examples/typeInference.ts */

import assert from 'node:assert/strict';

// #region usage
import { Predicates } from '../src/index.js';

// inferValueType maps JS values to JSON Schema type names
const nullType = Predicates.inferValueType(null);
const arrayType = Predicates.inferValueType([]);
const objectType = Predicates.inferValueType({});
const stringType = Predicates.inferValueType('hello');
const numberType = Predicates.inferValueType(42);
const booleanType = Predicates.inferValueType(true);

console.log('inferValueType(null):', nullType);     // 'null'
console.log('inferValueType([]):', arrayType);      // 'array'
console.log('inferValueType({}):', objectType);     // 'object'
console.log('inferValueType(hello):', stringType);  // 'string'
console.log('inferValueType(42):', numberType);     // 'number'
console.log('inferValueType(true):', booleanType);  // 'boolean'

// isFiniteNumber and isIntegerValue narrow numeric primitives
console.log('isFiniteNumber(42):', Predicates.isFiniteNumber(42));         // true
console.log('isFiniteNumber(Infinity):', Predicates.isFiniteNumber(Infinity)); // false
console.log('isIntegerValue(3):', Predicates.isIntegerValue(3));           // true
console.log('isIntegerValue(3.14):', Predicates.isIntegerValue(3.14));     // false

// matchesType dispatches to per-type matchers
console.log('matchesType integer 5:', Predicates.matchesType('integer', 5));    // true
console.log('matchesType number 5.5:', Predicates.matchesType('number', 5.5));  // true
console.log('matchesType object []:', Predicates.matchesType('object', []));    // false

// matchesAnyType is a union check: true if any type in the list matches
console.log('matchesAnyType string|null null:', Predicates.matchesAnyType(['string', 'null'], null)); // true
console.log('matchesAnyType string|null 42:', Predicates.matchesAnyType(['string', 'null'], 42));    // false
// #endregion usage

assert.equal(nullType, 'null');
assert.equal(arrayType, 'array');
assert.equal(objectType, 'object');
assert.equal(stringType, 'string');
assert.equal(numberType, 'number');
assert.equal(booleanType, 'boolean');

assert.equal(Predicates.isFiniteNumber(42), true);
assert.equal(Predicates.isFiniteNumber(Infinity), false);
assert.equal(Predicates.isFiniteNumber(NaN), false);
assert.equal(Predicates.isFiniteNumber('42'), false);
assert.equal(Predicates.isIntegerValue(3), true);
assert.equal(Predicates.isIntegerValue(3.14), false);

assert.equal(Predicates.matchesType('null', null), true);
assert.equal(Predicates.matchesType('array', [1, 2]), true);
assert.equal(Predicates.matchesType('integer', 5), true);
assert.equal(Predicates.matchesType('integer', 5.5), false);
assert.equal(Predicates.matchesType('number', 5.5), true);
assert.equal(Predicates.matchesType('object', {}), true);
assert.equal(Predicates.matchesType('object', []), false);
assert.equal(Predicates.matchesType('string', 'x'), true);
assert.equal(Predicates.matchesType('boolean', false), true);

assert.equal(Predicates.matchesAnyType(['string', 'null'], null), true);
assert.equal(Predicates.matchesAnyType(['string', 'null'], 'hi'), true);
assert.equal(Predicates.matchesAnyType(['string', 'null'], 42), false);
assert.equal(Predicates.matchesAnyType(['integer', 'boolean'], true), true);

console.log('typeInference: all assertions passed');
