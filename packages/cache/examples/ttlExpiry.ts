/** ttlExpiry — demonstrates TTL-based expiry with lazy eviction on access. Run: npx tsx examples/ttlExpiry.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

const cache = LruCache.create<string, string>({ 'capacity': 10, 'ttlMs': 10 });

cache.set('token', 'abc123');

// Before expiry, the entry is present
const beforeExpiry = cache.get('token');
console.log('get token before expiry:', beforeExpiry);
console.log('has token before expiry:', cache.has('token'));

// Wait 50ms — the 10ms TTL will have elapsed
await new Promise<void>((resolve) => { setTimeout(resolve, 50); });

// After expiry, get returns undefined (lazy eviction on access)
const afterExpiry = cache.get('token');
console.log('get token after expiry:', afterExpiry);
console.log('has token after expiry:', cache.has('token'));
// #endregion usage

assert.equal(beforeExpiry, 'abc123');
assert.equal(afterExpiry, undefined);
assert.equal(cache.has('token'), false);

console.log('ttlExpiry: all assertions passed');
