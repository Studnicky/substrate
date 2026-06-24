/** lruEviction — demonstrates LRU eviction policy when capacity is exceeded. Run: npx tsx examples/lruEviction.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

const cache = new LruCache<string, string>({ 'capacity': 2 });

// Fill to capacity
cache.set('a', 'alpha');
cache.set('b', 'beta');

// Access 'a' — promotes it to MRU; 'b' becomes LRU
const aBeforeEviction = cache.get('a');
console.log('get a (promotes to MRU):', aBeforeEviction);

// Adding 'c' evicts 'b' (least recently used)
cache.set('c', 'gamma');

const aAfter = cache.get('a');
const cAfter = cache.get('c');
const bAfter = cache.get('b');

console.log('get a after eviction:', aAfter);
console.log('get c after eviction:', cAfter);
console.log('get b after eviction (evicted):', bAfter);
console.log('has b:', cache.has('b'));
console.log('size:', cache.size);
// #endregion usage

assert.equal(aBeforeEviction, 'alpha');
assert.equal(aAfter, 'alpha');
assert.equal(cAfter, 'gamma');
assert.equal(bAfter, undefined);
assert.equal(cache.has('b'), false);
assert.equal(cache.size, 2);

console.log('lruEviction: all assertions passed');
