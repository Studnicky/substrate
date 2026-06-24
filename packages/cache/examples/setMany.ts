/** setMany — demonstrates bulk insertion with insertion-order semantics. Run: npx tsx examples/setMany.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

const cache = LruCache.create<string, number>({ 'capacity': 3 });

// Insert three entries at once; argument order determines recency.
// After the call: 'a' is LRU, 'c' is MRU.
cache.setMany([['a', 1], ['b', 2], ['c', 3]]);

console.log('get a:', cache.get('a')); // 1
console.log('get b:', cache.get('b')); // 2
console.log('get c:', cache.get('c')); // 3

// When the batch exceeds capacity the oldest-by-arg-order entry is evicted first.
// The cache is at capacity (3). Adding two more entries evicts 'a' then 'b'.
cache.setMany([['d', 4], ['e', 5]]);

console.log('get a after eviction:', cache.get('a')); // undefined — evicted (was LRU)
console.log('get b after eviction:', cache.get('b')); // undefined — evicted next
console.log('get c after eviction:', cache.get('c')); // 3
console.log('get d after eviction:', cache.get('d')); // 4
console.log('get e after eviction:', cache.get('e')); // 5

// A batch TTL applies to every entry in the call.
const ttlCache = LruCache.create<string, string>({ 'capacity': 10 });
ttlCache.setMany([['token', 'abc'], ['session', 'xyz']], 10_000);

console.log('has token:', ttlCache.has('token')); // true
console.log('has session:', ttlCache.has('session')); // true

// An empty array is a no-op.
const size = cache.size;
cache.setMany([]);
console.log('size unchanged after empty batch:', cache.size === size); // true
// #endregion usage

assert.equal(cache.get('a'), undefined);
assert.equal(cache.get('b'), undefined);
assert.equal(cache.get('c'), 3);
assert.equal(cache.get('d'), 4);
assert.equal(cache.get('e'), 5);
assert.equal(ttlCache.has('token'), true);
assert.equal(ttlCache.has('session'), true);
assert.equal(cache.size, size);

console.log('setMany: all assertions passed');
