/** patch-datatype — RFC-6902 JSON Patch, deep equality, type guards, and cycle-safe freeze. Run: npx tsx packages/json/examples/patch-datatype.ts */

import assert from 'node:assert/strict';

// #region usage
import { DataType, Frozen, Patch, PatchError } from '../src/index.js';
import { PatchDatatypeFixture } from './fixtures/PatchDatatypeFixture.js';

// ---------------------------------------------------------------------------
// Working documents — mutated in-place by Patch.apply/DataType.hasCycle below,
// so they stay local rather than living as shared, read-only fixture data.
// ---------------------------------------------------------------------------

const workingDocs: {
  'circular': Record<string, unknown>;
  'cyclic': Record<string, unknown>;
  'doc': Record<string, unknown>;
  'doc2': Record<string, unknown>;
  'doc3': Record<string, unknown>;
} = {
  'circular': { 'name': 'cycle' },
  'cyclic': { 'a': 1 },
  'doc': { 'count': 0, 'meta': { 'version': 1 }, 'status': 'draft' },
  'doc2': { 'name': 'alpha', 'tags': ['a', 'b'] },
  'doc3': {}
};

// ---------------------------------------------------------------------------
// Patch — instance-based RFC-6902 JSON Patch
// ---------------------------------------------------------------------------

// Using the constructor with an array of operations
const patch = Patch.create([
  { 'op': 'replace', 'path': '/status', 'value': 'published' },
  { 'op': 'add', 'path': '/publishedAt', 'value': '2026-06-22' },
  { 'op': 'remove', 'path': '/count' }
]);

patch.apply(workingDocs.doc);

console.log('doc after patch:', workingDocs.doc);

// Static factory methods
Patch.add('/score', 100).apply(workingDocs.doc2);
Patch.replace('/name', 'beta').apply(workingDocs.doc2);

console.log('doc2 after static patches:', workingDocs.doc2);

// Patch.combine merges multiple patches
const combined = Patch.combine(
  Patch.add('/x', 1),
  Patch.add('/y', 2)
);

combined.apply(workingDocs.doc3);

console.log('doc3 after combined patch:', workingDocs.doc3);

// test operation throws PatchError on mismatch
const strictPatch = Patch.test('/name', 'WRONG');

assert.throws(
  () => { strictPatch.apply({ 'name': 'actual' }); },
  PatchError,
  'test operation throws PatchError on mismatch'
);

console.log('isEmpty:', Patch.create([]).isEmpty(), Patch.add('/a', 1).isEmpty());

// ---------------------------------------------------------------------------
// DataType — deep equality and type guards
// ---------------------------------------------------------------------------

const nestedEqual = DataType.deepEqual({ 'a': [1, 2] }, { 'a': [1, 2] });
const nanEqual = DataType.deepEqual(Number.NaN, Number.NaN);

const d1 = new Date(1_000_000);
const d2 = new Date(1_000_000);
const m1 = PatchDatatypeFixture.M1;
const m2 = PatchDatatypeFixture.M2;

console.log('deepEqual nested arrays:', nestedEqual);
console.log('NaN equals NaN:', nanEqual);
console.log('Date equality:', DataType.deepEqual(d1, d2));
console.log('Map equality:', DataType.deepEqual(m1, m2));
console.log('isPlainObject({}):', DataType.isPlainObject({}));
console.log('isRecord({a:1}):', DataType.isRecord({ 'a': 1 }));

workingDocs.cyclic.self = workingDocs.cyclic;

console.log('hasCycle (cyclic):', DataType.hasCycle(workingDocs.cyclic));
console.log('hasCycle (plain):', DataType.hasCycle({ 'a': { 'b': 1 } }));

// ---------------------------------------------------------------------------
// Frozen — cycle-safe deep freeze
// ---------------------------------------------------------------------------

const tree = PatchDatatypeFixture.Tree;
const frozen = Frozen.deepFreeze(tree);

console.log('frozen === tree:', frozen === tree);
console.log('Object.isFrozen(frozen):', Object.isFrozen(frozen));

workingDocs.circular.back = workingDocs.circular;
Frozen.deepFreeze(workingDocs.circular);

console.log('circular frozen safely:', Object.isFrozen(workingDocs.circular));
// #endregion usage

assert.equal(workingDocs.doc.status, 'published', 'replace operation applied');
assert.equal(workingDocs.doc.publishedAt, '2026-06-22', 'add operation applied');
assert.equal(workingDocs.doc.count, undefined, 'remove operation applied');

assert.equal(workingDocs.doc2.score, 100, 'Patch.add static factory');
assert.equal(workingDocs.doc2.name, 'beta', 'Patch.replace static factory');

assert.equal(workingDocs.doc3.x, 1, 'combined patch: first op');
assert.equal(workingDocs.doc3.y, 2, 'combined patch: second op');

assert.equal(Patch.create([]).isEmpty(), true, 'empty patch reports isEmpty');
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

assert.equal(DataType.hasCycle(workingDocs.cyclic), true, 'cycle detected');
assert.equal(DataType.hasCycle({ 'a': { 'b': 1 } }), false, 'no cycle in plain object');

assert.equal(frozen, tree, 'deepFreeze returns same reference');
assert.equal(Object.isFrozen(frozen), true, 'root frozen');
assert.equal(Object.isFrozen(frozen.root), true, 'nested object frozen');
assert.equal(Object.isFrozen(frozen.root.child), true, 'deeply nested object frozen');
assert.doesNotThrow(() => { Frozen.deepFreeze(workingDocs.circular); }, 'circular reference handled safely');

console.log('patch-datatype: all assertions passed');
