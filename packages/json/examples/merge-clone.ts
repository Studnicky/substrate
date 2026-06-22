/**
 * Example: Merge and Clone
 * Run: npx tsx packages/json/examples/merge-clone.ts
 */

import assert from 'node:assert/strict';

import { Clone, Merge } from '../src/index.js';

// ---------------------------------------------------------------------------
// Merge.deep — nested objects
// ---------------------------------------------------------------------------

const base = { a: 1, b: { x: 10, y: 20 }, tags: ['alpha'] };
const overlay = { b: { y: 99, z: 3 }, c: 'new', tags: ['beta'] };

const merged = Merge.deep(base, overlay);

// Overlay primitive wins
assert.equal(merged.b.y, 99, 'overlay primitive wins');
// Base key preserved when not in overlay
assert.equal(merged.b.x, 10, 'base key preserved');
// Overlay-only key added
assert.equal(merged.b.z, 3, 'overlay key added');
assert.equal((merged as { c: string }).c, 'new', 'overlay top-level key added');
// Arrays replaced atomically by default
assert.deepEqual((merged as { tags: string[] }).tags, ['beta'], 'arrays replaced atomically');

// ---------------------------------------------------------------------------
// Clone.deep — structural equality, no shared references
// ---------------------------------------------------------------------------

const original = { items: [1, 2, 3], nested: { value: 42 }, created: new Date(0) };
const copy = Clone.deep(original);

// Structural equality
assert.deepEqual(copy, original, 'deep clone is structurally equal');
// Different reference
assert.notEqual(copy, original, 'clone is a different reference');
assert.notEqual(copy.items, original.items, 'nested array is a different reference');
assert.notEqual(copy.created, original.created, 'Date is cloned to a new instance');
assert.equal(copy.created.getTime(), original.created.getTime(), 'Date value is preserved');

// ---------------------------------------------------------------------------
// ConcatMerge — static-override subclass: arrays concatenate instead of replace
// ---------------------------------------------------------------------------

class ConcatMerge extends Merge {
  protected static override mergeArrays(base: unknown[], overlay: unknown[]): unknown[] {
    return [...base, ...overlay];
  }
}

const concatResult = ConcatMerge.deep({ tags: ['a', 'b'] }, { tags: ['c'] });

assert.deepEqual(
  (concatResult as { tags: string[] }).tags,
  ['a', 'b', 'c'],
  'ConcatMerge concatenates arrays'
);

// Regular Merge is unaffected by the subclass
const plainResult = Merge.deep({ tags: ['a', 'b'] }, { tags: ['c'] });

assert.deepEqual(
  (plainResult as { tags: string[] }).tags,
  ['c'],
  'Merge.deep still replaces arrays atomically'
);
