/** guard-accessors — type-safe Guard accessors and Empty producers. Run: npx tsx packages/types/examples/guard-accessors.ts */

import assert from 'node:assert/strict';

// #region usage
import { Empty, Guard, JsonValue } from '../src/index.js';
import { GuardAccessorsFixtures } from './fixtures/GuardAccessorsFixtures.js';

// ── Guard.isObject ───────────────────────────────────────────────────────────

const plainObj = Guard.isObject({ 'a': 1 });
const arrIsRecord = Guard.isObject([1, 2, 3]);
const nullIsRecord = Guard.isObject(null);

console.log('Guard.isObject({ a: 1 }):', plainObj);
console.log('Guard.isObject([1,2,3]):', arrIsRecord);
console.log('Guard.isObject(null):', nullIsRecord);

// ── Guard.asNumber / asStringOrNull ─────────────────────────────────────────

const numResult = Guard.asNumber(3.14);
const strOrNull = Guard.asStringOrNull(null);

console.log('Guard.asNumber(3.14):', numResult);
console.log('Guard.asStringOrNull(null):', strOrNull);

// ── Guard.asRecordArray ─────────────────────────────────────────────────────

const records = Guard.asRecordArray(GuardAccessorsFixtures.mixed);

console.log('Guard.asRecordArray([{id:1},"skip",{id:2},null]):', records);

// ── Guard type predicates ───────────────────────────────────────────────────

console.log('Guard.isString("hello"):', Guard.isString('hello'));
console.log('Guard.isNumber(3.14):', Guard.isNumber(3.14));
console.log('Guard.isNumber(NaN):', Guard.isNumber(Number.NaN));
console.log('Guard.isBoolean(true):', Guard.isBoolean(true));
console.log('Guard.isNonNegativeInteger(0):', Guard.isNonNegativeInteger(0));
console.log('Guard.isPositiveInteger(0):', Guard.isPositiveInteger(0));

// ── Static-override subclass ────────────────────────────────────────────────

class StrictGuard extends Guard {
  public static override isObject(value: unknown): value is Record<string, unknown> {
    return super.isObject(value) && !Array.isArray(value);
  }
}

const strictArr = StrictGuard.asRecordArray([{ 'a': 1 }, 99, { 'b': 2 }]);

console.log('StrictGuard.asRecordArray([{a:1},99,{b:2}]):', strictArr);

// ── Empty producers ─────────────────────────────────────────────────────────

const emptyStr = Empty.string();
const emptyObj = Empty.object();
const emptyArr = Empty.array<number>();
const emptyMap = Empty.map<string, number>();
const emptySet = Empty.set<string>();

console.log('Empty.string():', JSON.stringify(emptyStr));
console.log('Empty.object():', emptyObj);
console.log('Empty.array<number>():', emptyArr);
console.log('Empty.map<string,number>().size:', emptyMap.size);
console.log('Empty.set<string>().size:', emptySet.size);

// ── Empty predicates ────────────────────────────────────────────────────────

console.log('Empty.isString(""):', Empty.isString(''));
console.log('Empty.isObject({}):', Empty.isObject({}));
console.log('Empty.isArray([]):', Empty.isArray([]));
console.log('Empty.isMap(new Map()):', Empty.isMap(new Map()));
console.log('Empty.isSet(new Set()):', Empty.isSet(new Set()));

// ── JSON value boundary ─────────────────────────────────────────────────────

const value = GuardAccessorsFixtures.value;

console.log('value:', JSON.stringify(value));
// #endregion usage

// Guard assertions
assert.equal(plainObj, true, 'plain object is a record');
assert.equal(arrIsRecord, false, 'array is not a record');
assert.equal(nullIsRecord, false, 'null is not a record');
assert.equal(Guard.isObject('hello'), false, 'string is not a record');

assert.equal(numResult, 3.14);
assert.equal(Guard.asNumber('3'), undefined, 'string is not a number');
assert.equal(Guard.asNumber(Number.NaN), Number.NaN, 'NaN passes typeof check');
assert.equal(strOrNull, null, 'null returns null');
assert.equal(Guard.asStringOrNull('hello'), 'hello');
assert.equal(Guard.asStringOrNull(42), undefined, 'number returns undefined');

assert.ok(records !== undefined);
assert.equal(records?.length, 2, 'non-record elements are filtered out');
assert.equal(records?.[0]?.id, 1);
assert.equal(records?.[1]?.id, 2);
assert.equal(Guard.asRecordArray('not-an-array'), undefined);
assert.equal(Guard.asRecordArray(['a', 'b']), undefined, 'all-string array returns undefined');

assert.equal(Guard.isString('hello'), true);
assert.equal(Guard.isString(42), false);
assert.equal(Guard.isNumber(3.14), true);
assert.equal(Guard.isNumber(Number.NaN), false, 'NaN is not a valid number');
assert.equal(Guard.isBoolean(true), true);
assert.equal(Guard.isBoolean(1), false);
assert.equal(Guard.isFunction(JSON.stringify), true);
assert.equal(Guard.isFunction('fn'), false);
assert.equal(Guard.isNonNegativeInteger(0), true);
assert.equal(Guard.isNonNegativeInteger(5), true);
assert.equal(Guard.isNonNegativeInteger(-1), false);
assert.equal(Guard.isPositiveInteger(1), true);
assert.equal(Guard.isPositiveInteger(0), false);

assert.equal(StrictGuard.isObject({ 'x': 1 }), true, 'StrictGuard accepts plain objects');
assert.equal(StrictGuard.isObject([]), false, 'StrictGuard rejects arrays');
assert.ok(strictArr !== undefined);
assert.equal(strictArr?.length, 2);

assert.equal(emptyStr, '', 'Empty.string() returns empty string');
assert.deepEqual(emptyObj, {}, 'Empty.object() returns empty object');
assert.deepEqual(emptyArr, [], 'Empty.array() returns empty array');
assert.equal(emptyMap.size, 0, 'Empty.map() returns empty map');
assert.equal(emptySet.size, 0, 'Empty.set() returns empty set');

assert.equal(Empty.isString(''), true);
assert.equal(Empty.isString('x'), false);
assert.equal(Empty.isObject({}), true);
assert.equal(Empty.isObject({ 'a': 1 }), false);
assert.equal(Empty.isArray([]), true);
assert.equal(Empty.isArray([1]), false);
assert.equal(Empty.isMap(new Map()), true);
assert.equal(Empty.isSet(new Set()), true);

assert.equal(JsonValue.is(value), true, 'JSON value validation accepts nested JSON');
assert.deepEqual(value, { 'nested': [1, 'two', null] }, 'canonical JSON value accepts nested JSON');

console.log('guard-accessors: all assertions passed');
