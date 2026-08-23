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

const document = PathSortHashFixture.Document;

console.log('Path.get user.address.city:', Path.get(document, 'user.address.city'));
console.log('Path.get items[0].name:', Path.get(document, 'items[0].name'));
console.log('Path.get missing.key:', Path.get(document, 'missing.key'));
console.log('Path.get __proto__:', Path.get(document, '__proto__'));

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

const firstHash = Hash.value({ 'a': 1, 'b': 2 });
const secondHash = Hash.value({ 'a': 1, 'b': 2 });

console.log('firstHash:', firstHash, 'secondHash:', secondHash, 'equal:', firstHash === secondHash);

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

assert.equal(Path.get(document, 'user.address.city'), 'Melbourne', 'nested path retrieves value');
assert.equal(Path.get(document, 'items[0].name'), 'alpha', 'array index in path');
assert.equal(Path.get(document, 'missing.key'), undefined, 'missing path returns undefined');
assert.equal(Path.get(document, '__proto__'), undefined, '__proto__ blocked');
assert.equal(Path.get(document, 'constructor'), undefined, 'constructor blocked');

assert.deepEqual(files, ['file1', 'file2', 'file10'], 'natural sort treats numerics as numbers');
assert.deepEqual(byLength, ['description', 'type', 'id'], 'longestFirst ordering');
assert.deepEqual(byLengthAsc, ['id', 'type', 'description'], 'shortestFirst ordering');

assert.equal(firstHash, secondHash, 'key-order-normalised hash');
assert.equal(typeof firstHash, 'string', 'hash is a string');
assert.equal(firstHash.length, 8, 'hash is 8 hex chars');
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
