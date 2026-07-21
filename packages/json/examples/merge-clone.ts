/** merge-clone — deep merge with nested objects and Clone with Date/array awareness. Run: npx tsx packages/json/examples/merge-clone.ts */

import assert from 'node:assert/strict';

// #region usage
import { Clone, Merge } from '../src/index.js';
import { MergeCloneFixture } from './fixtures/MergeCloneFixture.js';

// ---------------------------------------------------------------------------
// Merge.deep — nested objects
// ---------------------------------------------------------------------------

const base = MergeCloneFixture.Base;
const overlay = MergeCloneFixture.Overlay;

const merged = Merge.deep(base, overlay);

console.log('merged.b:', merged.b);
console.log('merged.tags:', merged.tags);

// ---------------------------------------------------------------------------
// Clone.deep — structural equality, no shared references
// ---------------------------------------------------------------------------

const original = MergeCloneFixture.Original;
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

console.log('concatResult.tags:', concatResult.tags);
console.log('plainResult.tags:', plainResult.tags);
// #endregion usage

assert.deepEqual(merged.b, { 'x': 10, 'y': 99, 'z': 3 }, 'nested objects merge recursively');
assert.equal(merged.c, 'new', 'overlay top-level key added');
assert.deepEqual(merged.tags, ['beta'], 'arrays replaced atomically');

assert.deepEqual(copy, original, 'deep clone is structurally equal');
assert.notEqual(copy, original, 'clone is a different reference');
assert.notEqual(copy.items, original.items, 'nested array is a different reference');
assert.notEqual(copy.created, original.created, 'Date is cloned to a new instance');
assert.equal(copy.created.getTime(), original.created.getTime(), 'Date value is preserved');

assert.deepEqual(
  concatResult.tags,
  ['a', 'b', 'c'],
  'ConcatMerge concatenates arrays'
);
assert.deepEqual(
  plainResult.tags,
  ['c'],
  'Merge.deep still replaces arrays atomically'
);

console.log('merge-clone: all assertions passed');
