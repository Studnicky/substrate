/** basicCache — demonstrates set, get, has, size, delete, and clear. Run: npx tsx examples/basicCache.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

const cache = new LruCache<string, number>({ 'capacity': 10 });

// set and get a value
cache.set('score', 99);
console.log('get score:', cache.get('score'));

// has returns true for a stored key
console.log('has score:', cache.has('score'));

// size reflects the number of entries
cache.set('level', 3);
console.log('size after two sets:', cache.size);

// delete removes the entry and returns true
const deleted = cache.delete('score');
console.log('deleted score:', deleted);
console.log('has score after delete:', cache.has('score'));
console.log('get score after delete:', cache.get('score'));

// size decrements after delete
console.log('size after delete:', cache.size);

// clear removes all entries
cache.clear();
console.log('size after clear:', cache.size);
console.log('has level after clear:', cache.has('level'));
// #endregion usage

assert.equal(cache.size, 0);
assert.equal(cache.has('level'), false);
assert.equal(deleted, true);

console.log('basicCache: all assertions passed');
