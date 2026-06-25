/** builder-cache — construct an LruCache via the fluent builder API. Run: npx tsx packages/cache/examples/builder-cache.ts */
import assert from 'node:assert/strict';

import { LruCache } from '../src/index.js';

// #region usage
// Build a capacity-2 cache with a 5-second TTL and a 'demo' key prefix.
const cache = LruCache.builder<string, number>()
  .withCapacity(2)
  .withTtlMs(5_000)
  .withPrefix('demo')
  .build();

console.log('builder-cache: cache constructed via fluent builder');
console.log('builder-cache: initial size:', cache.size);

// Set two entries — cache is now at capacity.
cache.set('a', 1);
console.log('builder-cache: set("a", 1) — size:', cache.size);

cache.set('b', 2);
console.log('builder-cache: set("b", 2) — size:', cache.size);

// Read 'a' to promote it to most-recently-used.
const hitA = cache.get('a');
console.log('builder-cache: get("a") —>', hitA);

// Insert a third key. Cache is at capacity; 'b' is least-recently-used and is evicted.
cache.set('c', 3);
console.log('builder-cache: set("c", 3) — size:', cache.size);

// 'b' was evicted; 'a' and 'c' survive.
const missB = cache.get('b');
console.log('builder-cache: get("b") after eviction —>', missB);
console.log('builder-cache: has("a"):', cache.has('a'));
console.log('builder-cache: has("b"):', cache.has('b'));
console.log('builder-cache: has("c"):', cache.has('c'));
// #endregion usage

assert.equal(hitA, 1);
assert.equal(missB, undefined);
assert.equal(cache.has('b'), false);
assert.equal(cache.has('a'), true);
assert.equal(cache.has('c'), true);
assert.equal(cache.size, 2);

console.log('builder-cache: all assertions passed');
