/** patch-datatype — RFC-6902 JSON Patch, deep equality, type guards, and cycle-safe freeze. Run: npx tsx packages/json/examples/patch-datatype.ts */

import assert from 'node:assert/strict';

// #region usage
import { DataType, Frozen, Patch, PatchError } from '../src/index.js';

// ---------------------------------------------------------------------------
// Patch — instance-based RFC-6902 JSON Patch
// ---------------------------------------------------------------------------

// Using the constructor with an array of operations
const doc: Record<string, unknown> = { 'count': 0, 'meta': { 'version': 1 }, 'status': 'draft' };

const patch = new Patch([
  { 'op': 'replace', 'path': '/status', 'value': 'published' },
  { 'op': 'add', 'path': '/publishedAt', 'value': '2026-06-22' },
  { 'op': 'remove', 'path': '/count' }
]);

patch.apply(doc);

console.log('doc after patch:', doc);

// Static factory methods
const doc2: Record<string, unknown> = { 'name': 'alpha', 'tags': ['a', 'b'] };

Patch.add('/score', 100).apply(doc2);
Patch.replace('/name', 'beta').apply(doc2);

console.log('doc2 after static patches:', doc2);

// Patch.combine merges multiple patches
const combined = Patch.combine(
  Patch.add('/x', 1),
  Patch.add('/y', 2)
);
const doc3: Record<string, unknown> = {};

combined.apply(doc3);

console.log('doc3 after combined patch:', doc3);

// test operation throws PatchError on mismatch
const strictPatch = Patch.test('/name', 'WRONG');

assert.throws(
  () => { strictPatch.apply({ 'name': 'actual' }); },
  PatchError,
  'test operation throws PatchError on mismatch'
);

console.log('isEmpty:', new Patch([]).isEmpty(), Patch.add('/a', 1).isEmpty());

// ---------------------------------------------------------------------------
// DataType — deep equality and type guards
// ---------------------------------------------------------------------------

const nestedEqual = DataType.deepEqual({ 'a': [1, 2] }, { 'a': [1, 2] });
const nanEqual = DataType.deepEqual(Number.NaN, Number.NaN);

const d1 = new Date(1_000_000);
const d2 = new Date(1_000_000);
const m1 = new Map([['a', 1]]);
const m2 = new Map([['a', 1]]);

console.log('deepEqual nested arrays:', nestedEqual);
console.log('NaN equals NaN:', nanEqual);
console.log('Date equality:', DataType.deepEqual(d1, d2));
console.log('Map equality:', DataType.deepEqual(m1, m2));
console.log('isPlainObject({}):', DataType.isPlainObject({}));
console.log('isRecord({a:1}):', DataType.isRecord({ 'a': 1 }));

const cyclic: Record<string, unknown> = { 'a': 1 };

cyclic.self = cyclic;

console.log('hasCycle (cyclic):', DataType.hasCycle(cyclic));
console.log('hasCycle (plain):', DataType.hasCycle({ 'a': { 'b': 1 } }));

// ---------------------------------------------------------------------------
// Frozen — cycle-safe deep freeze
// ---------------------------------------------------------------------------

const tree = { 'root': { 'child': { 'value': 42 } } };
const frozen = Frozen.deepFreeze(tree);

console.log('frozen === tree:', frozen === tree);
console.log('Object.isFrozen(frozen):', Object.isFrozen(frozen));

const circular: Record<string, unknown> = { 'name': 'cycle' };

circular.back = circular;
Frozen.deepFreeze(circular);

console.log('circular frozen safely:', Object.isFrozen(circular));
// #endregion usage

assert.equal(doc.status, 'published', 'replace operation applied');
assert.equal(doc.publishedAt, '2026-06-22', 'add operation applied');
assert.equal(doc.count, undefined, 'remove operation applied');

assert.equal(doc2.score, 100, 'Patch.add static factory');
assert.equal(doc2.name, 'beta', 'Patch.replace static factory');

assert.equal(doc3.x, 1, 'combined patch: first op');
assert.equal(doc3.y, 2, 'combined patch: second op');

assert.equal(new Patch([]).isEmpty(), true, 'empty patch reports isEmpty');
assert.equal(Patch.add('/a', 1).isEmpty(), false, 'non-empty patch not isEmpty');

assert.equal(nestedEqual, true, 'deepEqual for nested arrays');
assert.equal(DataType.deepEqual({ 'a': 1 }, { 'a': 2 }), false, 'deepEqual detects difference');
assert.equal(nanEqual, true, 'NaN equals NaN');
assert.equal(DataType.deepEqual(d1, d2), true, 'Date equality by value');
assert.equal(DataType.deepEqual(m1, m2), true, 'Map deep equality');

assert.equal(DataType.isPlainObject({}), true, 'plain object guard');
assert.equal(DataType.isPlainObject([]), false, 'array is not plain object');
assert.equal(DataType.isPlainObject(null), false, 'null is not plain object');
assert.equal(DataType.isRecord([]), false, 'array is not record');
assert.equal(DataType.isRecord({ 'a': 1 }), true, 'object is record');

assert.equal(DataType.hasCycle(cyclic), true, 'cycle detected');
assert.equal(DataType.hasCycle({ 'a': { 'b': 1 } }), false, 'no cycle in plain object');

assert.equal(frozen, tree, 'deepFreeze returns same reference');
assert.equal(Object.isFrozen(frozen), true, 'root frozen');
assert.equal(Object.isFrozen(frozen.root), true, 'nested object frozen');
assert.equal(Object.isFrozen(frozen.root.child), true, 'deeply nested object frozen');
assert.doesNotThrow(() => { Frozen.deepFreeze(circular); }, 'circular reference handled safely');

console.log('patch-datatype: all assertions passed');
