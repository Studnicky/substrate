/** guard-accessors — type-safe Guard accessors and Empty producers. Run: npx tsx packages/types/examples/guard-accessors.ts */

import assert from 'node:assert/strict';

// #region usage
import type { JsonSchemaObjectType, JsonValueType } from '../src/index.js';

import { Empty, Guard } from '../src/index.js';

// ── Guard.isRecord ──────────────────────────────────────────────────────────

const plainObj = Guard.isRecord({ 'a': 1 });
const arrIsRecord = Guard.isRecord([1, 2, 3]);
const nullIsRecord = Guard.isRecord(null);

console.log('Guard.isRecord({ a: 1 }):', plainObj);
console.log('Guard.isRecord([1,2,3]):', arrIsRecord);
console.log('Guard.isRecord(null):', nullIsRecord);

// ── Guard.asRecord ──────────────────────────────────────────────────────────

const rec = Guard.asRecord({ 'age': 42, 'name': 'Ada' });
const recFromNull = Guard.asRecord(null);

console.log('Guard.asRecord({ age:42, name:"Ada" }):', rec);
console.log('Guard.asRecord(null):', recFromNull);

// ── Guard.asString / asNumber / asStringOrNull ──────────────────────────────

const str = Guard.asString('hello');
const numResult = Guard.asNumber(3.14);
const strOrNull = Guard.asStringOrNull(null);

console.log('Guard.asString("hello"):', str);
console.log('Guard.asNumber(3.14):', numResult);
console.log('Guard.asStringOrNull(null):', strOrNull);

// ── Guard.asRecordArray ─────────────────────────────────────────────────────

const mixed: unknown = [{ 'id': 1 }, 'skip', { 'id': 2 }, null];
const records = Guard.asRecordArray(mixed);

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
  public static override isRecord(value: unknown): value is Record<string, unknown> {
    return super.isRecord(value) && !Array.isArray(value);
  }
}

const strictRec = StrictGuard.asRecord({ 'host': 'localhost' });
const strictArr = StrictGuard.asRecordArray([{ 'a': 1 }, 99, { 'b': 2 }]);

console.log('StrictGuard.asRecord({ host:"localhost" }):', strictRec);
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

// ── Type-level witnesses ────────────────────────────────────────────────────
// Values typed as JsonSchemaObjectType / JsonValueType prove the utility at compile time.

const schema: JsonSchemaObjectType = { 'type': 'string' };
const value: JsonValueType = { 'nested': [1, 'two', null] };

console.log('schema.type:', schema.type);
console.log('value:', JSON.stringify(value));
// #endregion usage

// Guard assertions
assert.equal(plainObj, true, 'plain object is a record');
assert.equal(arrIsRecord, false, 'array is not a record');
assert.equal(nullIsRecord, false, 'null is not a record');
assert.equal(Guard.isRecord('hello'), false, 'string is not a record');

assert.ok(rec !== undefined, 'asRecord returns the object');
assert.equal(rec?.name, 'Ada');
assert.equal(recFromNull, undefined, 'asRecord returns undefined for null');
assert.equal(Guard.asRecord([]), undefined, 'asRecord returns undefined for array');

assert.equal(str, 'hello');
assert.equal(Guard.asString(42), undefined, 'number is not a string');
assert.equal(Guard.asString(null), undefined, 'null is not a string');
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
assert.equal(Guard.isObject({ 'a': 1 }), true);
assert.equal(Guard.isObject(null), false);
assert.equal(Guard.isObject([]), false, 'array is not an object');
assert.equal(Guard.isNonNegativeInteger(0), true);
assert.equal(Guard.isNonNegativeInteger(5), true);
assert.equal(Guard.isNonNegativeInteger(-1), false);
assert.equal(Guard.isPositiveInteger(1), true);
assert.equal(Guard.isPositiveInteger(0), false);

assert.equal(StrictGuard.isRecord({ 'x': 1 }), true, 'StrictGuard accepts plain objects');
assert.equal(StrictGuard.isRecord([]), false, 'StrictGuard rejects arrays');
assert.ok(strictRec !== undefined);
assert.equal(strictRec?.host, 'localhost');
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

assert.equal(schema.type, 'string', 'JsonSchemaObjectType accepts schema keyword object');
assert.deepEqual(value, { 'nested': [1, 'two', null] }, 'JsonValueType accepts nested JSON');

console.log('guard-accessors: all assertions passed');
