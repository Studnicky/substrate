/**
 * LruCache Unit Tests
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { LruCache } from '../../src/LruCache.js';

// --- Scenario runners (synchronous, simple input → check) ---

const getHasDeleteScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'get() returns undefined for a missing key',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10 });
      assert.equal(cache.get('missing'), undefined);
    },
  },
  {
    description: 'set() + get() returns the stored value',
    exec: () => {
      const cache = new LruCache<string, string>({ capacity: 10 });
      cache.set('key', 'value');
      assert.equal(cache.get('key'), 'value');
    },
  },
  {
    description: 'has() returns true for an existing key',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10 });
      cache.set('a', 1);
      assert.equal(cache.has('a'), true);
    },
  },
  {
    description: 'has() returns false for a missing key',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10 });
      assert.equal(cache.has('missing'), false);
    },
  },
  {
    description: 'delete() removes key and returns true on success',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10 });
      cache.set('x', 42);
      assert.equal(cache.delete('x'), true);
      assert.equal(cache.get('x'), undefined);
    },
  },
  {
    description: 'delete() returns false when key is absent',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10 });
      assert.equal(cache.delete('nonexistent'), false);
    },
  },
];

for (const { description, exec } of getHasDeleteScenarios) {
  it(description, exec);
}

const prefixScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'caches with different prefixes do not share entries',
    exec: () => {
      const cacheA = new LruCache<string, number>({ capacity: 10, prefix: 'ns-a' });
      const cacheB = new LruCache<string, number>({ capacity: 10, prefix: 'ns-b' });
      cacheA.set('key', 1);
      cacheB.set('key', 2);
      assert.equal(cacheA.get('key'), 1);
      assert.equal(cacheB.get('key'), 2);
    },
  },
  {
    description: 'same LruCache with prefix stores prefixed key',
    exec: () => {
      const cache = new LruCache<string, number>({ capacity: 10, prefix: 'ns' });
      cache.set('item', 7);
      assert.equal(cache.get('item'), 7);
      assert.equal(cache.size, 1);
    },
  },
  {
    description: 'unprefixed and prefixed caches are independent',
    exec: () => {
      const plain = new LruCache<string, number>({ capacity: 10 });
      const prefixed = new LruCache<string, number>({ capacity: 10, prefix: 'pfx' });
      plain.set('key', 10);
      prefixed.set('key', 20);
      assert.equal(plain.get('key'), 10);
      assert.equal(prefixed.get('key'), 20);
      assert.deepEqual([plain.size, prefixed.size], [1, 1]);
    },
  },
];

for (const { description, exec } of prefixScenarios) {
  it(description, exec);
}

// --- Flat it() blocks for stateful / async tests ---

it('size reflects the current entry count', () => {
  const cache = new LruCache<string, number>({ capacity: 10 });

  assert.equal(cache.size, 0);

  cache.set('a', 1);
  assert.equal(cache.size, 1);

  cache.set('b', 2);
  assert.equal(cache.size, 2);

  cache.delete('a');
  assert.equal(cache.size, 1);
});

it('clear() empties the cache', () => {
  const cache = new LruCache<string, number>({ capacity: 10 });

  cache.set('a', 1);
  cache.set('b', 2);
  cache.clear();

  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), undefined);
});

it('LRU eviction: evicts the least-recently-used entry when at capacity', () => {
  const cache = new LruCache<string, number>({ capacity: 2 });

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3); // 'a' should be evicted (LRU)

  assert.equal(cache.get('a'), undefined, 'a should be evicted');
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

it('LRU promotion on access: promotes accessed entry; evicts the un-accessed one', () => {
  const cache = new LruCache<string, number>({ capacity: 2 });

  cache.set('a', 1);
  cache.set('b', 2);

  // Access 'a' to promote it to MRU; 'b' becomes LRU
  cache.get('a');

  // Insert 'c' — 'b' should be evicted, not 'a'
  cache.set('c', 3);

  assert.equal(cache.get('a'), 1, 'a should survive (was promoted)');
  assert.equal(cache.get('b'), undefined, 'b should be evicted (became LRU)');
  assert.equal(cache.get('c'), 3);
});

it('TTL expiry: get() returns undefined after entry TTL expires', async () => {
  const cache = new LruCache<string, number>({ capacity: 10 });

  cache.set('k', 99, 1); // 1 ms TTL

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 5);
  });

  assert.equal(cache.get('k'), undefined);
});

it('TTL expiry: get() returns value before TTL expires', () => {
  const cache = new LruCache<string, number>({ capacity: 10, ttlMs: 10_000 });

  cache.set('k', 42);

  assert.equal(cache.get('k'), 42);
});

it('per-entry TTL overrides global TTL: per-entry ttlMs takes precedence over the global default', async () => {
  // Global TTL is 10 s, but we override this entry with 1 ms
  const cache = new LruCache<string, string>({ capacity: 10, ttlMs: 10_000 });

  cache.set('short', 'expires-fast', 1);
  cache.set('long', 'stays');

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 5);
  });

  assert.equal(cache.get('short'), undefined, 'short-TTL entry should be expired');
  assert.equal(cache.get('long'), 'stays', 'global-TTL entry should still be present');
});
