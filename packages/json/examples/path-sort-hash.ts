/** path-sort-hash — JSON Pointer conversion, proto-safe path access, natural sort, FNV-1a hash, and StructuralHash. Run: npx tsx packages/json/examples/path-sort-hash.ts */

import assert from 'node:assert/strict';

// #region usage
import { Hash, Path, Sort, StructuralHash } from '../src/index.js';
import { PathSortHashFixture } from './fixtures/PathSortHashFixture.js';

// ---------------------------------------------------------------------------
// Path.toAccess — JSON Pointer → JS access notation
// ---------------------------------------------------------------------------

console.log('Path.toAccess(/items/0/name):', Path.toAccess('/items/0/name'));
console.log('Path.toAccess(/user/address/city):', Path.toAccess('/user/address/city'));
console.log('Path.toAccess():', JSON.stringify(Path.toAccess('')));
console.log('Path.toAccess(/):', JSON.stringify(Path.toAccess('/')));

// ---------------------------------------------------------------------------
// Path.get — proto-safe dot-path read
// ---------------------------------------------------------------------------

const doc = PathSortHashFixture.Doc;

console.log('Path.get user.address.city:', Path.get(doc, 'user.address.city'));
console.log('Path.get items[0].name:', Path.get(doc, 'items[0].name'));
console.log('Path.get missing.key:', Path.get(doc, 'missing.key'));
console.log('Path.get __proto__:', Path.get(doc, '__proto__'));

// ---------------------------------------------------------------------------
// Sort.natural — numeric substrings sorted as numbers
// ---------------------------------------------------------------------------

const files = ['file10', 'file2', 'file1'].sort(Sort.natural);
const byLength = ['id', 'type', 'description'].sort(Sort.longestFirst);
const byLengthAsc = ['description', 'id', 'type'].sort(Sort.shortestFirst);

console.log('natural sort:', files);
console.log('longestFirst:', byLength);
console.log('shortestFirst:', byLengthAsc);

// ---------------------------------------------------------------------------
// Hash.value — deterministic FNV-1a 32-bit hex
// ---------------------------------------------------------------------------

const h1 = Hash.value({ 'a': 1, 'b': 2 });
const h2 = Hash.value({ 'a': 1, 'b': 2 });

console.log('h1:', h1, 'h2:', h2, 'equal:', h1 === h2);

// ---------------------------------------------------------------------------
// StructuralHash.of — strips annotation-only keys before hashing
// ---------------------------------------------------------------------------

const schemaWithMeta = PathSortHashFixture.SchemaWithMeta;
const schemaBare = PathSortHashFixture.SchemaBare;

console.log('StructuralHash with meta:', StructuralHash.of(schemaWithMeta));
console.log('StructuralHash bare:', StructuralHash.of(schemaBare));
console.log('equal (annotations stripped):', StructuralHash.of(schemaWithMeta) === StructuralHash.of(schemaBare));
// #endregion usage

assert.equal(Path.toAccess('/items/0/name'), 'items[0].name', 'numeric segment becomes bracket index');
assert.equal(Path.toAccess('/user/address/city'), 'user.address.city', 'identifier segments joined by dot');
assert.equal(Path.toAccess(''), '', 'root pointer returns empty string');
assert.equal(Path.toAccess('/'), '', 'slash-only pointer returns empty string');

assert.equal(Path.get(doc, 'user.address.city'), 'Melbourne', 'nested path retrieves value');
assert.equal(Path.get(doc, 'items[0].name'), 'alpha', 'array index in path');
assert.equal(Path.get(doc, 'missing.key'), undefined, 'missing path returns undefined');
assert.equal(Path.get(doc, '__proto__'), undefined, '__proto__ blocked');
assert.equal(Path.get(doc, 'constructor'), undefined, 'constructor blocked');

assert.deepEqual(files, ['file1', 'file2', 'file10'], 'natural sort treats numerics as numbers');
assert.deepEqual(byLength, ['description', 'type', 'id'], 'longestFirst ordering');
assert.deepEqual(byLengthAsc, ['id', 'type', 'description'], 'shortestFirst ordering');

assert.equal(h1, h2, 'key-order-normalised hash');
assert.equal(typeof h1, 'string', 'hash is a string');
assert.equal(h1.length, 8, 'hash is 8 hex chars');
assert.notEqual(Hash.value({ 'a': 1 }), Hash.value({ 'a': 2 }), 'different values produce different hashes');

assert.equal(
  StructuralHash.of(schemaWithMeta),
  StructuralHash.of(schemaBare),
  'annotation-only keys stripped before hash comparison'
);
assert.notEqual(
  StructuralHash.of({ 'type': 'string' }),
  StructuralHash.of({ 'type': 'number' }),
  'structurally different schemas hash differently'
);

console.log('path-sort-hash: all assertions passed');
