/** predicates-accessors — type-safe Predicates accessors and Empty producers. Run: npx tsx packages/types/examples/predicates-accessors.ts */

import assert from 'node:assert/strict';

// #region usage
import { Empty, JsonValue, Predicates } from '../src/index.js';
import { PredicatesAccessorsFixtures } from './fixtures/PredicatesAccessorsFixtures.js';

// ── Predicates.isObject ──────────────────────────────────────────────────────

const plainObject = Predicates.isObject({ 'a': 1 });
const arrayIsRecord = Predicates.isObject([1, 2, 3]);
const nullIsRecord = Predicates.isObject(null);

console.log('Predicates.isObject({ a: 1 }):', plainObject);
console.log('Predicates.isObject([1,2,3]):', arrayIsRecord);
console.log('Predicates.isObject(null):', nullIsRecord);

// ── Predicates.asNumber / asStringOrNull ────────────────────────────────────

const numberResult = Predicates.asNumber(3.14);
const stringOrNull = Predicates.asStringOrNull(null);

console.log('Predicates.asNumber(3.14):', numberResult);
console.log('Predicates.asStringOrNull(null):', stringOrNull);

// ── Predicates.asRecordArray ────────────────────────────────────────────────

const records = Predicates.asRecordArray(PredicatesAccessorsFixtures.mixed);

console.log('Predicates.asRecordArray([{id:1},"skip",{id:2},null]):', records);

// ── Predicates type predicates ──────────────────────────────────────────────

console.log('Predicates.isString("hello"):', Predicates.isString('hello'));
console.log('Predicates.isNumber(3.14):', Predicates.isNumber(3.14));
console.log('Predicates.isNumber(NaN):', Predicates.isNumber(Number.NaN));
console.log('Predicates.isBoolean(true):', Predicates.isBoolean(true));
console.log('Predicates.isNonNegativeInteger(0):', Predicates.isNonNegativeInteger(0));
console.log('Predicates.isPositiveInteger(0):', Predicates.isPositiveInteger(0));

// ── Static-override subclass ────────────────────────────────────────────────

class StrictPredicates extends Predicates {
  public static override isObject<T>(value: T): value is Record<string, unknown> & T {
    if (super.isObject(value) && !Array.isArray(value)) {
      return true;
    }
    return false;
  }
}

const strictArray = StrictPredicates.asRecordArray([{ 'a': 1 }, 99, { 'b': 2 }]);

console.log('StrictPredicates.asRecordArray([{a:1},99,{b:2}]):', strictArray);

// ── Empty producers ─────────────────────────────────────────────────────────

const emptyString = Empty.string();
const emptyObject = Empty.object();
const emptyArray = Empty.array<number>();
const emptyMap = Empty.map<string, number>();
const emptySet = Empty.set<string>();

console.log('Empty.string():', JSON.stringify(emptyString));
console.log('Empty.object():', emptyObject);
console.log('Empty.array<number>():', emptyArray);
console.log('Empty.map<string,number>().size:', emptyMap.size);
console.log('Empty.set<string>().size:', emptySet.size);

// ── Predicates emptiness checks ─────────────────────────────────────────────

console.log('Predicates.isEmptyString(""):', Predicates.isEmptyString(''));
console.log('Predicates.isEmptyPlainObject({}):', Predicates.isEmptyPlainObject({}));
console.log('Predicates.isEmptyArray([]):', Predicates.isEmptyArray([]));
console.log('Predicates.isEmptyMap(new Map()):', Predicates.isEmptyMap(new Map()));
console.log('Predicates.isEmptySet(new Set()):', Predicates.isEmptySet(new Set()));

// ── JSON value boundary ─────────────────────────────────────────────────────

const value = PredicatesAccessorsFixtures.value;

console.log('value:', JSON.stringify(value));
// #endregion usage

// Predicates assertions
assert.equal(plainObject, true, 'plain object is a record');
assert.equal(arrayIsRecord, false, 'array is not a record');
assert.equal(nullIsRecord, false, 'null is not a record');
assert.equal(Predicates.isObject('hello'), false, 'string is not a record');

assert.equal(numberResult, 3.14);
assert.equal(Predicates.asNumber('3'), undefined, 'string is not a number');
assert.equal(Predicates.asNumber(Number.NaN), Number.NaN, 'NaN passes typeof check');
assert.equal(stringOrNull, null, 'null returns null');
assert.equal(Predicates.asStringOrNull('hello'), 'hello');
assert.equal(Predicates.asStringOrNull(42), undefined, 'number returns undefined');

assert.ok(records !== undefined);
assert.equal(records?.length, 2, 'non-record elements are filtered out');
assert.equal(records?.[0]?.id, 1);
assert.equal(records?.[1]?.id, 2);
assert.equal(Predicates.asRecordArray('not-an-array'), undefined);
assert.equal(Predicates.asRecordArray(['a', 'b']), undefined, 'all-string array returns undefined');

assert.equal(Predicates.isString('hello'), true);
assert.equal(Predicates.isString(42), false);
assert.equal(Predicates.isNumber(3.14), true);
assert.equal(Predicates.isNumber(Number.NaN), false, 'NaN is not a valid number');
assert.equal(Predicates.isBoolean(true), true);
assert.equal(Predicates.isBoolean(1), false);
assert.equal(Predicates.isFunction(JSON.stringify), true);
assert.equal(Predicates.isFunction('fn'), false);
assert.equal(Predicates.isNonNegativeInteger(0), true);
assert.equal(Predicates.isNonNegativeInteger(5), true);
assert.equal(Predicates.isNonNegativeInteger(-1), false);
assert.equal(Predicates.isPositiveInteger(1), true);
assert.equal(Predicates.isPositiveInteger(0), false);

assert.equal(StrictPredicates.isObject({ 'x': 1 }), true, 'StrictPredicates accepts plain objects');
assert.equal(StrictPredicates.isObject([]), false, 'StrictPredicates rejects arrays');
assert.ok(strictArray !== undefined);
assert.equal(strictArray?.length, 2);

assert.equal(emptyString, '', 'Empty.string() returns empty string');
assert.deepEqual(emptyObject, {}, 'Empty.object() returns empty object');
assert.deepEqual(emptyArray, [], 'Empty.array() returns empty array');
assert.equal(emptyMap.size, 0, 'Empty.map() returns empty map');
assert.equal(emptySet.size, 0, 'Empty.set() returns empty set');

assert.equal(Predicates.isEmptyString(''), true);
assert.equal(Predicates.isEmptyString('x'), false);
assert.equal(Predicates.isEmptyPlainObject({}), true);
assert.equal(Predicates.isEmptyPlainObject({ 'a': 1 }), false);
assert.equal(Predicates.isEmptyArray([]), true);
assert.equal(Predicates.isEmptyArray([1]), false);
assert.equal(Predicates.isEmptyMap(new Map()), true);
assert.equal(Predicates.isEmptySet(new Set()), true);

assert.equal(JsonValue.is(value), true, 'JSON value validation accepts nested JSON');
assert.deepEqual(value, { 'nested': [1, 'two', null] }, 'canonical JSON value accepts nested JSON');

console.log('predicates-accessors: all assertions passed');
