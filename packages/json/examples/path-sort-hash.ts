/**
 * Example: Path, Sort, Hash, and StructuralHash
 * Run: npx tsx packages/json/examples/path-sort-hash.ts
 */

import assert from 'node:assert/strict';

import { Hash, Path, Sort, StructuralHash } from '../src/index.js';

// ---------------------------------------------------------------------------
// Path.toAccess — JSON Pointer → JS access notation
// ---------------------------------------------------------------------------

assert.equal(Path.toAccess('/items/0/name'), 'items[0].name', 'numeric segment becomes bracket index');
assert.equal(Path.toAccess('/user/address/city'), 'user.address.city', 'identifier segments joined by dot');
assert.equal(Path.toAccess(''), '', 'root pointer returns empty string');
assert.equal(Path.toAccess('/'), '', 'slash-only pointer returns empty string');

// ---------------------------------------------------------------------------
// Path.get — proto-safe dot-path read
// ---------------------------------------------------------------------------

const doc = {
  user: { address: { city: 'Melbourne' } },
  items: [{ name: 'alpha' }, { name: 'beta' }]
};

assert.equal(Path.get(doc, 'user.address.city'), 'Melbourne', 'nested path retrieves value');
assert.equal(Path.get(doc, 'items[0].name'), 'alpha', 'array index in path');
assert.equal(Path.get(doc, 'missing.key'), undefined, 'missing path returns undefined');

// Proto-pollution guard
assert.equal(Path.get(doc, '__proto__'), undefined, '__proto__ blocked');
assert.equal(Path.get(doc, 'constructor'), undefined, 'constructor blocked');

// ---------------------------------------------------------------------------
// Sort.natural — numeric substrings sorted as numbers
// ---------------------------------------------------------------------------

const files = ['file10', 'file2', 'file1'].sort(Sort.natural);

assert.deepEqual(files, ['file1', 'file2', 'file10'], 'natural sort treats numerics as numbers');

// Sort.longestFirst
const byLength = ['id', 'type', 'description'].sort(Sort.longestFirst);

assert.deepEqual(byLength, ['description', 'type', 'id'], 'longestFirst ordering');

// Sort.shortestFirst
const byLengthAsc = ['description', 'id', 'type'].sort(Sort.shortestFirst);

assert.deepEqual(byLengthAsc, ['id', 'type', 'description'], 'shortestFirst ordering');

// ---------------------------------------------------------------------------
// Hash.value — deterministic FNV-1a 32-bit hex
// ---------------------------------------------------------------------------

// Key order normalised: {b,a} and {a,b} hash identically
const h1 = Hash.value({ b: 2, a: 1 });
const h2 = Hash.value({ a: 1, b: 2 });

assert.equal(h1, h2, 'key-order-normalised hash');
assert.equal(typeof h1, 'string', 'hash is a string');
assert.equal(h1.length, 8, 'hash is 8 hex chars');

// Different values produce different hashes
assert.notEqual(Hash.value({ a: 1 }), Hash.value({ a: 2 }), 'different values produce different hashes');

// ---------------------------------------------------------------------------
// StructuralHash.of — strips annotation-only keys before hashing
// ---------------------------------------------------------------------------

const schemaWithMeta = { type: 'string', title: 'My Field', description: 'A description', $id: '#myField' };
const schemaBare = { type: 'string' };

assert.equal(
  StructuralHash.of(schemaWithMeta),
  StructuralHash.of(schemaBare),
  'annotation-only keys stripped before hash comparison'
);

// Different structural content produces different hashes
assert.notEqual(
  StructuralHash.of({ type: 'string' }),
  StructuralHash.of({ type: 'number' }),
  'structurally different schemas hash differently'
);
