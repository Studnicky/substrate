/** lruEviction — demonstrates LRU eviction policy when capacity is exceeded. Run: npx tsx examples/lruEviction.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

const cache = LruCache.create<string, string>({ 'capacity': 2 });

// Northstar Books keeps its hottest catalogue records in a bounded cache.
cache.set('978-0132350884', 'Clean Code');
cache.set('978-0201633610', 'Design Patterns');

// A checkout lookup for Clean Code promotes that catalogue record to MRU.
const cleanCodeBeforeEviction = cache.get('978-0132350884');
console.log('catalogue hit for Clean Code:', cleanCodeBeforeEviction);

// Reading a third title evicts the least recently used catalogue record.
cache.set('978-0321125217', 'Domain-Driven Design');

const cleanCodeAfter = cache.get('978-0132350884');
const domainDrivenDesignAfter = cache.get('978-0321125217');
const designPatternsAfter = cache.get('978-0201633610');

console.log('cached Clean Code:', cleanCodeAfter);
console.log('cached Domain-Driven Design:', domainDrivenDesignAfter);
console.log('evicted Design Patterns:', designPatternsAfter);
console.log('catalogue size:', cache.size);
// #endregion usage

assert.equal(cleanCodeBeforeEviction, 'Clean Code');
assert.equal(cleanCodeAfter, 'Clean Code');
assert.equal(domainDrivenDesignAfter, 'Domain-Driven Design');
assert.equal(designPatternsAfter, undefined);
assert.equal(cache.has('978-0201633610'), false);
assert.equal(cache.size, 2);

console.log('lruEviction: all assertions passed');
