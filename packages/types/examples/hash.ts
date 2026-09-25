/** hash — FNV-1a hash and StructuralHash. Run: npx tsx packages/types/examples/hash.ts */

import assert from 'node:assert/strict';

// #region usage
import { Hash, StructuralHash } from '../src/index.js';
import { HashFixture } from './fixtures/HashFixture.js';

// ---------------------------------------------------------------------------
// Hash.value — deterministic FNV-1a 32-bit hex
// ---------------------------------------------------------------------------

const firstHash = Hash.value({ 'a': 1, 'b': 2 });
const secondHash = Hash.value({ 'a': 1, 'b': 2 });

console.log('firstHash:', firstHash, 'secondHash:', secondHash, 'equal:', firstHash === secondHash);

// ---------------------------------------------------------------------------
// StructuralHash.of — strips annotation-only keys before hashing
// ---------------------------------------------------------------------------

const schemaWithMeta = HashFixture.SchemaWithMeta;
const schemaBare = HashFixture.SchemaBare;

console.log('StructuralHash with meta:', StructuralHash.of(schemaWithMeta));
console.log('StructuralHash bare:', StructuralHash.of(schemaBare));
console.log('equal (annotations stripped):', StructuralHash.of(schemaWithMeta) === StructuralHash.of(schemaBare));
// #endregion usage

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

console.log('hash: all assertions passed');
