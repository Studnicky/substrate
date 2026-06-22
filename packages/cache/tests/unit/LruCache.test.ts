/**
 * LruCache Unit Tests
 */

import {
  deepStrictEqual,
  strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LruCache } from '../../src/LruCache.js';

void describe('LruCache', () => {
  void describe('miss on unknown key', () => {
    void it('get() returns undefined for a missing key', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      strictEqual(cache.get('missing'), undefined);
    });
  });

  void describe('basic set and get round-trip', () => {
    void it('set() + get() returns the stored value', () => {
      const cache = new LruCache<string, string>({ capacity: 10 });

      cache.set('key', 'value');

      strictEqual(cache.get('key'), 'value');
    });
  });

  void describe('has()', () => {
    void it('returns true for an existing key', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      cache.set('a', 1);

      strictEqual(cache.has('a'), true);
    });

    void it('returns false for a missing key', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      strictEqual(cache.has('missing'), false);
    });
  });

  void describe('delete()', () => {
    void it('removes key and returns true on success', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      cache.set('x', 42);

      strictEqual(cache.delete('x'), true);
      strictEqual(cache.get('x'), undefined);
    });

    void it('returns false when key is absent', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      strictEqual(cache.delete('nonexistent'), false);
    });
  });

  void describe('size', () => {
    void it('reflects the current entry count', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      strictEqual(cache.size, 0);

      cache.set('a', 1);
      strictEqual(cache.size, 1);

      cache.set('b', 2);
      strictEqual(cache.size, 2);

      cache.delete('a');
      strictEqual(cache.size, 1);
    });
  });

  void describe('clear()', () => {
    void it('empties the cache', () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      strictEqual(cache.size, 0);
      strictEqual(cache.get('a'), undefined);
      strictEqual(cache.get('b'), undefined);
    });
  });

  void describe('LRU eviction', () => {
    void it('evicts the least-recently-used entry when at capacity', () => {
      const cache = new LruCache<string, number>({ capacity: 2 });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // 'a' should be evicted (LRU)

      strictEqual(cache.get('a'), undefined, 'a should be evicted');
      strictEqual(cache.get('b'), 2);
      strictEqual(cache.get('c'), 3);
    });
  });

  void describe('LRU promotion on access', () => {
    void it('promotes accessed entry; evicts the un-accessed one', () => {
      const cache = new LruCache<string, number>({ capacity: 2 });

      cache.set('a', 1);
      cache.set('b', 2);

      // Access 'a' to promote it to MRU; 'b' becomes LRU
      cache.get('a');

      // Insert 'c' — 'b' should be evicted, not 'a'
      cache.set('c', 3);

      strictEqual(cache.get('a'), 1, 'a should survive (was promoted)');
      strictEqual(cache.get('b'), undefined, 'b should be evicted (became LRU)');
      strictEqual(cache.get('c'), 3);
    });
  });

  void describe('TTL expiry', () => {
    void it('get() returns undefined after entry TTL expires', async () => {
      const cache = new LruCache<string, number>({ capacity: 10 });

      cache.set('k', 99, 1); // 1 ms TTL

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });

      strictEqual(cache.get('k'), undefined);
    });

    void it('get() returns value before TTL expires', () => {
      const cache = new LruCache<string, number>({ capacity: 10, ttlMs: 10_000 });

      cache.set('k', 42);

      strictEqual(cache.get('k'), 42);
    });
  });

  void describe('per-entry TTL overrides global TTL', () => {
    void it('per-entry ttlMs takes precedence over the global default', async () => {
      // Global TTL is 10 s, but we override this entry with 1 ms
      const cache = new LruCache<string, string>({ capacity: 10, ttlMs: 10_000 });

      cache.set('short', 'expires-fast', 1);
      cache.set('long', 'stays');

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });

      strictEqual(cache.get('short'), undefined, 'short-TTL entry should be expired');
      strictEqual(cache.get('long'), 'stays', 'global-TTL entry should still be present');
    });
  });

  void describe('prefix isolation', () => {
    void it('caches with different prefixes do not share entries', () => {
      const cacheA = new LruCache<string, number>({ capacity: 10, prefix: 'ns-a' });
      const cacheB = new LruCache<string, number>({ capacity: 10, prefix: 'ns-b' });

      cacheA.set('key', 1);
      cacheB.set('key', 2);

      strictEqual(cacheA.get('key'), 1);
      strictEqual(cacheB.get('key'), 2);
    });

    void it('same LruCache with prefix stores prefixed key', () => {
      const cache = new LruCache<string, number>({ capacity: 10, prefix: 'ns' });

      cache.set('item', 7);

      strictEqual(cache.get('item'), 7);
      strictEqual(cache.size, 1);
    });

    void it('unprefixed and prefixed caches are independent', () => {
      const plain = new LruCache<string, number>({ capacity: 10 });
      const prefixed = new LruCache<string, number>({ capacity: 10, prefix: 'pfx' });

      plain.set('key', 10);
      prefixed.set('key', 20);

      strictEqual(plain.get('key'), 10);
      strictEqual(prefixed.get('key'), 20);

      // Verify sizes are independent
      deepStrictEqual([plain.size, prefixed.size], [1, 1]);
    });
  });
});
