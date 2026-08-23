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
  'document': Record<string, unknown>;
  'documentThree': Record<string, unknown>;
  'documentTwo': Record<string, unknown>;
} = {
  'circular': { 'name': 'cycle' },
  'cyclic': { 'a': 1 },
  'document': { 'count': 0, 'meta': { 'version': 1 }, 'status': 'draft' },
  'documentThree': {},
  'documentTwo': { 'name': 'alpha', 'tags': ['a', 'b'] }
};

// ---------------------------------------------------------------------------
// Patch — instance-based RFC-6902 JSON Patch
// ---------------------------------------------------------------------------

// Create a patch with an array of operations
const patch = Patch.create([
  { 'op': 'replace', 'path': '/status', 'value': 'published' },
  { 'op': 'add', 'path': '/publishedAt', 'value': '2026-06-22' },
  { 'op': 'remove', 'path': '/count' }
]);

patch.apply(workingDocs.document);

console.log('document after patch:', workingDocs.document);

Patch.create({ 'op': 'add', 'path': '/score', 'value': 100 }).apply(workingDocs.documentTwo);
Patch.create({ 'op': 'replace', 'path': '/name', 'value': 'beta' }).apply(workingDocs.documentTwo);

console.log('documentTwo after patches:', workingDocs.documentTwo);

const combined = Patch.create([
  { 'op': 'add', 'path': '/x', 'value': 1 },
  { 'op': 'add', 'path': '/y', 'value': 2 }
]);

combined.apply(workingDocs.documentThree);

console.log('documentThree after combined patch:', workingDocs.documentThree);

// test operation throws PatchError on mismatch
const strictPatch = Patch.create({ 'op': 'test', 'path': '/name', 'value': 'WRONG' });

assert.throws(
  () => { strictPatch.apply({ 'name': 'actual' }); },
  PatchError,
  'test operation throws PatchError on mismatch'
);

console.log('isEmpty:', Patch.create([]).isEmpty(), Patch.create({ 'op': 'add', 'path': '/a', 'value': 1 }).isEmpty());

// ---------------------------------------------------------------------------
// DataType — deep equality and type guards
// ---------------------------------------------------------------------------

const nestedEqual = DataType.deepEqual({ 'a': [1, 2] }, { 'a': [1, 2] });
const nanEqual = DataType.deepEqual(Number.NaN, Number.NaN);

const firstDate = new Date(1_000_000);
const secondDate = new Date(1_000_000);
const firstMap = PatchDatatypeFixture.M1;
const secondMap = PatchDatatypeFixture.M2;

console.log('deepEqual nested arrays:', nestedEqual);
console.log('NaN equals NaN:', nanEqual);
console.log('Date equality:', DataType.deepEqual(firstDate, secondDate));
console.log('Map equality:', DataType.deepEqual(firstMap, secondMap));
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

assert.equal(workingDocs.document.status, 'published', 'replace operation applied');
assert.equal(workingDocs.document.publishedAt, '2026-06-22', 'add operation applied');
assert.equal(workingDocs.document.count, undefined, 'remove operation applied');

assert.equal(workingDocs.documentTwo.score, 100, 'add operation applied');
assert.equal(workingDocs.documentTwo.name, 'beta', 'replace operation applied');

assert.equal(workingDocs.documentThree.x, 1, 'combined patch: first op');
assert.equal(workingDocs.documentThree.y, 2, 'combined patch: second op');

assert.equal(Patch.create([]).isEmpty(), true, 'empty patch reports isEmpty');
assert.equal(Patch.create({ 'op': 'add', 'path': '/a', 'value': 1 }).isEmpty(), false, 'non-empty patch not isEmpty');

assert.equal(nestedEqual, true, 'deepEqual for nested arrays');
assert.equal(DataType.deepEqual({ 'a': 1 }, { 'a': 2 }), false, 'deepEqual detects difference');
assert.equal(nanEqual, true, 'NaN equals NaN');
assert.equal(DataType.deepEqual(firstDate, secondDate), true, 'Date equality by value');
assert.equal(DataType.deepEqual(firstMap, secondMap), true, 'Map deep equality');

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
