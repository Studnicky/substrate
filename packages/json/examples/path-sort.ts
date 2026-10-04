/** path-sort — JSON Pointer conversion, proto-safe path access, and natural sort. Run: npx tsx packages/json/examples/path-sort.ts */

import assert from 'node:assert/strict';

// #region usage
import { Path, Sort } from '../src/index.js';
import { PathSortFixture } from './fixtures/PathSortFixture.js';

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

const document = PathSortFixture.Document;

console.log('Path.get user.address.city:', Path.get(document, 'user.address.city'));
console.log('Path.get items[0].name:', Path.get(document, 'items[0].name'));
console.log('Path.get missing.key:', Path.get(document, 'missing.key'));
console.log('Path.get __proto__:', Path.get(document, '__proto__'));

// ---------------------------------------------------------------------------
// Sort.natural — numeric substrings sorted as numbers
// ---------------------------------------------------------------------------

const files = ['file10', 'file2', 'file1'].toSorted(Sort.natural);
const byLength = ['id', 'type', 'description'].toSorted(Sort.longestFirst);
const byLengthAsc = ['description', 'id', 'type'].toSorted(Sort.shortestFirst);

console.log('natural sort:', files);
console.log('longestFirst:', byLength);
console.log('shortestFirst:', byLengthAsc);
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

console.log('path-sort: all assertions passed');
