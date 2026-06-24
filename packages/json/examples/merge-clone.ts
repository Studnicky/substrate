/** merge-clone — deep merge with nested objects and Clone with Date/array awareness. Run: npx tsx packages/json/examples/merge-clone.ts */

import assert from 'node:assert/strict';

// #region usage
import { Clone, Merge } from '../src/index.js';

// ---------------------------------------------------------------------------
// Merge.deep — nested objects
// ---------------------------------------------------------------------------

const base = { 'a': 1, 'b': { 'x': 10, 'y': 20 }, 'tags': ['alpha'] };
const overlay = { 'b': { 'y': 99, 'z': 3 }, 'c': 'new', 'tags': ['beta'] };

const merged = Merge.deep(base, overlay);

console.log('merged.b:', merged.b);
console.log('merged.tags:', (merged as { 'tags': string[] }).tags);

// ---------------------------------------------------------------------------
// Clone.deep — structural equality, no shared references
// ---------------------------------------------------------------------------

const original = { 'created': new Date(0), 'items': [1, 2, 3], 'nested': { 'value': 42 } };
const copy = Clone.deep(original);

console.log('copy.created:', copy.created);
console.log('same reference?', copy === original);

// ---------------------------------------------------------------------------
// ConcatMerge — static-override subclass: arrays concatenate instead of replace
// ---------------------------------------------------------------------------

class ConcatMerge extends Merge {
  protected static override mergeArrays(base: unknown[], overlay: unknown[]): unknown[] {
    return [...base, ...overlay];
  }
}

const concatResult = ConcatMerge.deep({ 'tags': ['a', 'b'] }, { 'tags': ['c'] });
const plainResult = Merge.deep({ 'tags': ['a', 'b'] }, { 'tags': ['c'] });

console.log('concatResult.tags:', (concatResult as { 'tags': string[] }).tags);
console.log('plainResult.tags:', (plainResult as { 'tags': string[] }).tags);
// #endregion usage

assert.equal(merged.b.y, 99, 'overlay primitive wins');
assert.equal(merged.b.x, 10, 'base key preserved');
assert.equal(merged.b.z, 3, 'overlay key added');
assert.equal((merged as { 'c': string }).c, 'new', 'overlay top-level key added');
assert.deepEqual((merged as { 'tags': string[] }).tags, ['beta'], 'arrays replaced atomically');

assert.deepEqual(copy, original, 'deep clone is structurally equal');
assert.notEqual(copy, original, 'clone is a different reference');
assert.notEqual(copy.items, original.items, 'nested array is a different reference');
assert.notEqual(copy.created, original.created, 'Date is cloned to a new instance');
assert.equal(copy.created.getTime(), original.created.getTime(), 'Date value is preserved');

assert.deepEqual(
  (concatResult as { 'tags': string[] }).tags,
  ['a', 'b', 'c'],
  'ConcatMerge concatenates arrays'
);
assert.deepEqual(
  (plainResult as { 'tags': string[] }).tags,
  ['c'],
  'Merge.deep still replaces arrays atomically'
);

console.log('merge-clone: all assertions passed');
