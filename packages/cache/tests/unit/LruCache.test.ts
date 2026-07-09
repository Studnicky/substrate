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
      const cache = LruCache.create<string, number>({ capacity: 10 });
      assert.equal(cache.get('missing'), undefined);
    },
  },
  {
    description: 'set() + get() returns the stored value',
    exec: () => {
      const cache = LruCache.create<string, string>({ capacity: 10 });
      cache.set('key', 'value');
      assert.equal(cache.get('key'), 'value');
    },
  },
  {
    description: 'has() returns true for an existing key',
    exec: () => {
      const cache = LruCache.create<string, number>({ capacity: 10 });
      cache.set('a', 1);
      assert.equal(cache.has('a'), true);
    },
  },
  {
    description: 'has() returns false for a missing key',
    exec: () => {
      const cache = LruCache.create<string, number>({ capacity: 10 });
      assert.equal(cache.has('missing'), false);
    },
  },
  {
    description: 'delete() removes key and returns true on success',
    exec: () => {
      const cache = LruCache.create<string, number>({ capacity: 10 });
      cache.set('x', 42);
      assert.equal(cache.delete('x'), true);
      assert.equal(cache.get('x'), undefined);
    },
  },
  {
    description: 'delete() returns false when key is absent',
    exec: () => {
      const cache = LruCache.create<string, number>({ capacity: 10 });
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
      const cacheA = LruCache.create<string, number>({ capacity: 10, prefix: 'ns-a' });
      const cacheB = LruCache.create<string, number>({ capacity: 10, prefix: 'ns-b' });
      cacheA.set('key', 1);
      cacheB.set('key', 2);
      assert.equal(cacheA.get('key'), 1);
      assert.equal(cacheB.get('key'), 2);
    },
  },
  {
    description: 'same LruCache with prefix stores prefixed key',
    exec: () => {
      const cache = LruCache.create<string, number>({ capacity: 10, prefix: 'ns' });
      cache.set('item', 7);
      assert.equal(cache.get('item'), 7);
      assert.equal(cache.size, 1);
    },
  },
  {
    description: 'unprefixed and prefixed caches are independent',
    exec: () => {
      const plain = LruCache.create<string, number>({ capacity: 10 });
      const prefixed = LruCache.create<string, number>({ capacity: 10, prefix: 'pfx' });
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
  const cache = LruCache.create<string, number>({ capacity: 10 });

  assert.equal(cache.size, 0);

  cache.set('a', 1);
  assert.equal(cache.size, 1);

  cache.set('b', 2);
  assert.equal(cache.size, 2);

  cache.delete('a');
  assert.equal(cache.size, 1);
});

it('clear() empties the cache', () => {
  const cache = LruCache.create<string, number>({ capacity: 10 });

  cache.set('a', 1);
  cache.set('b', 2);
  cache.clear();

  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), undefined);
});

it('LRU eviction: evicts the least-recently-used entry when at capacity', () => {
  const cache = LruCache.create<string, number>({ capacity: 2 });

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3); // 'a' should be evicted (LRU)

  assert.equal(cache.get('a'), undefined, 'a should be evicted');
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

it('LRU promotion on access: promotes accessed entry; evicts the un-accessed one', () => {
  const cache = LruCache.create<string, number>({ capacity: 2 });

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
  const cache = LruCache.create<string, number>({ capacity: 10 });

  cache.set('k', 99, { ttlMs: 1 }); // 1 ms TTL

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 5);
  });

  assert.equal(cache.get('k'), undefined);
});

it('TTL expiry: get() returns value before TTL expires', () => {
  const cache = LruCache.create<string, number>({ capacity: 10, ttlMs: 10_000 });

  cache.set('k', 42);

  assert.equal(cache.get('k'), 42);
});

it('per-entry TTL overrides global TTL: per-entry ttlMs takes precedence over the global default', async () => {
  // Global TTL is 10 s, but we override this entry with 1 ms
  const cache = LruCache.create<string, string>({ capacity: 10, ttlMs: 10_000 });

  cache.set('short', 'expires-fast', { ttlMs: 1 });
  cache.set('long', 'stays');

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 5);
  });

  assert.equal(cache.get('short'), undefined, 'short-TTL entry should be expired');
  assert.equal(cache.get('long'), 'stays', 'global-TTL entry should still be present');
});

// --- setMany ---

it('setMany: empty array is a no-op', () => {
  const cache = LruCache.create<string, number>({ capacity: 10 });
  cache.set('existing', 1);
  cache.setMany([]);
  assert.equal(cache.size, 1);
  assert.equal(cache.get('existing'), 1);
});

it('setMany: inserts entries in argument order (last entry is MRU)', () => {
  const cache = LruCache.create<string, number>({ capacity: 10 });
  cache.setMany([['a', 1], ['b', 2], ['c', 3]]);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.size, 3);
});

it('setMany: insertion order determines MRU — last arg is most-recently-used', () => {
  // capacity=2, insert 3 via setMany: 'a' (first=LRU) should be evicted by 'c'
  const cache = LruCache.create<string, number>({ capacity: 2 });
  cache.setMany([['a', 1], ['b', 2], ['c', 3]]);
  assert.equal(cache.get('a'), undefined, 'a was LRU after batch and should be evicted');
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);
});

it('setMany: capacity eviction during batch evicts oldest-by-arg-order first', () => {
  // capacity=3; pre-fill with 'x' (LRU), then batch ['d','e','f'].
  // 'x' is evicted when 'f' is inserted (x was the oldest entry).
  // 'd' and 'e' survive because only one slot was needed.
  const cache = LruCache.create<string, number>({ capacity: 3 });
  cache.set('x', 0);
  cache.setMany([['d', 4], ['e', 5], ['f', 6]]);
  assert.equal(cache.get('x'), undefined, 'x should be evicted (was LRU before batch)');
  assert.equal(cache.get('d'), 4, 'd survives (eviction only consumed the pre-existing x slot)');
  assert.equal(cache.get('e'), 5);
  assert.equal(cache.get('f'), 6);
  assert.equal(cache.size, 3);
});

it('setMany: TTL applied to all batch entries', async () => {
  const cache = LruCache.create<string, number>({ capacity: 10 });
  cache.setMany([['p', 1], ['q', 2]], 1); // 1 ms TTL

  await new Promise<void>((resolve) => { setTimeout(resolve, 5); });

  assert.equal(cache.get('p'), undefined, 'p should have expired');
  assert.equal(cache.get('q'), undefined, 'q should have expired');
});

it('setMany: existing key in batch is updated and promoted to MRU', () => {
  const cache = LruCache.create<string, number>({ capacity: 3 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  // 'a' is LRU; re-inserting 'a' via batch should promote it
  cache.setMany([['a', 99]]);
  // Now 'b' is LRU — adding a new entry should evict 'b', not 'a'
  cache.set('d', 4);
  assert.equal(cache.get('a'), 99, 'a should have the updated value');
  assert.equal(cache.get('b'), undefined, 'b should be evicted (became LRU after a was promoted)');
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.get('d'), 4);
});

// ---------------------------------------------------------------------------
// Lifecycle hooks — recording subclass
// ---------------------------------------------------------------------------

type HookEventType =
  | { 'event': 'hit'; 'key': string; 'value': number }
  | { 'event': 'stale'; 'key': string; 'value': number }
  | { 'event': 'miss'; 'key': string }
  | { 'event': 'set'; 'key': string }
  | { 'event': 'update'; 'key': string }
  | { 'event': 'evict'; 'key': string; 'reason': 'capacity' }
  | { 'event': 'expire'; 'key': string }
  | { 'event': 'delete'; 'key': string }
  | { 'event': 'clear'; 'count': number };

class RecordingCache extends LruCache<string, number> {
  readonly log: HookEventType[] = [];

  protected override onHit(key: string, value: number): void {
    this.log.push({ 'event': 'hit', 'key': key, 'value': value });
  }

  protected override onStale(key: string, value: number): void {
    this.log.push({ 'event': 'stale', 'key': key, 'value': value });
  }

  protected override onMiss(key: string): void {
    this.log.push({ 'event': 'miss', 'key': key });
  }

  protected override onSet(key: string): void {
    this.log.push({ 'event': 'set', 'key': key });
  }

  protected override onUpdate(key: string): void {
    this.log.push({ 'event': 'update', 'key': key });
  }

  protected override onEvict(key: string, reason: 'capacity'): void {
    this.log.push({ 'event': 'evict', 'key': key, 'reason': reason });
  }

  protected override onExpire(key: string): void {
    this.log.push({ 'event': 'expire', 'key': key });
  }

  protected override onDelete(key: string): void {
    this.log.push({ 'event': 'delete', 'key': key });
  }

  protected override onClear(count: number): void {
    this.log.push({ 'event': 'clear', 'count': count });
  }
}

const hookScenarios: Array<{ description: string; exec: () => void | Promise<void> }> = [
  {
    description: 'onMiss fires when get() finds no entry',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.get('absent');
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'miss', 'key': 'absent' });
    },
  },
  {
    description: 'onSet fires when a new key is inserted',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('a', 1);
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'set', 'key': 'a' });
    },
  },
  {
    description: 'onHit fires on get() for a live entry',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('a', 42);
      cache.log.length = 0; // clear set event
      cache.get('a');
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'hit', 'key': 'a', 'value': 42 });
    },
  },
  {
    description: 'onUpdate fires when set() overwrites an existing key',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('a', 1);
      cache.log.length = 0;
      cache.set('a', 2);
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'update', 'key': 'a' });
    },
  },
  {
    description: 'onEvict fires with reason "capacity" when LRU tail is removed',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 2 });
      cache.set('first', 1);
      cache.set('second', 2);
      cache.log.length = 0;
      cache.set('third', 3); // evicts 'first'
      const evictEvents = cache.log.filter((e) => { return e.event === 'evict'; });
      assert.equal(evictEvents.length, 1);
      assert.deepEqual(evictEvents[0], { 'event': 'evict', 'key': 'first', 'reason': 'capacity' });
    },
  },
  {
    description: 'onDelete fires when delete() removes an existing entry',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('k', 5);
      cache.log.length = 0;
      cache.delete('k');
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'delete', 'key': 'k' });
    },
  },
  {
    description: 'onDelete does NOT fire when delete() is called on absent key',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.delete('nonexistent');
      assert.equal(cache.log.length, 0);
    },
  },
  {
    description: 'onClear fires with correct count of entries present before clear',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.log.length = 0;
      cache.clear();
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'clear', 'count': 3 });
    },
  },
  {
    description: 'onClear fires with count 0 when cache is already empty',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.clear();
      assert.equal(cache.log.length, 1);
      assert.deepEqual(cache.log[0], { 'event': 'clear', 'count': 0 });
    },
  },
  {
    description: 'onExpire and onMiss both fire (in that order) when get() hits an expired entry',
    exec: async () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('x', 7, { ttlMs: 1 }); // 1 ms TTL
      cache.log.length = 0;
      await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
      const result = cache.get('x');
      assert.equal(result, undefined);
      assert.equal(cache.log.length, 2);
      assert.deepEqual(cache.log[0], { 'event': 'expire', 'key': 'x' });
      assert.deepEqual(cache.log[1], { 'event': 'miss', 'key': 'x' });
    },
  },
  {
    description: 'onExpire fires when has() encounters an expired entry',
    exec: async () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('y', 9, { ttlMs: 1 }); // 1 ms TTL
      cache.log.length = 0;
      await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
      const present = cache.has('y');
      assert.equal(present, false);
      const expireEvents = cache.log.filter((e) => { return e.event === 'expire'; });
      assert.equal(expireEvents.length, 1);
      assert.deepEqual(expireEvents[0], { 'event': 'expire', 'key': 'y' });
    },
  },
  {
    description: 'set-vs-update: onSet fires for new key, onUpdate fires for overwrite (never both)',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 10 });
      cache.set('k', 1); // new → onSet
      cache.set('k', 2); // overwrite → onUpdate
      const sets = cache.log.filter((e) => { return e.event === 'set'; });
      const updates = cache.log.filter((e) => { return e.event === 'update'; });
      assert.equal(sets.length, 1);
      assert.equal(updates.length, 1);
    },
  },
  {
    description: 'onEvict fires with the correct evicted key, not the inserted key',
    exec: () => {
      const cache = new RecordingCache({ 'capacity': 1 });
      cache.set('lru', 0);
      cache.log.length = 0;
      cache.set('new', 1);
      const evictEvents = cache.log.filter((e) => { return e.event === 'evict'; });
      assert.equal(evictEvents.length, 1);
      if (evictEvents[0]?.event === 'evict') {
        assert.equal(evictEvents[0].key, 'lru');
      }
    },
  },
];

for (const { description, exec } of hookScenarios) {
  it(description, exec);
}

// ---------------------------------------------------------------------------
// staleMs — soft staleness marker
// ---------------------------------------------------------------------------

it('no staleMs configured: get() always fires onHit, never onStale', () => {
  const cache = new RecordingCache({ 'capacity': 10 });
  cache.set('a', 1);
  cache.log.length = 0;
  cache.get('a');
  assert.equal(cache.log.length, 1);
  assert.deepEqual(cache.log[0], { 'event': 'hit', 'key': 'a', 'value': 1 });
});

it('staleMs shorter than ttlMs: fires onStale (not onHit) once past the stale mark but before hard expiry, and still returns the value', async () => {
  const cache = new RecordingCache({ 'capacity': 10, 'staleMs': 1, 'ttlMs': 10_000 });
  cache.set('a', 1);
  cache.log.length = 0;

  await new Promise<void>((resolve) => { setTimeout(resolve, 5); });

  const result = cache.get('a');
  assert.equal(result, 1, 'entry is still live and servable past staleMs');
  assert.equal(cache.log.length, 1);
  assert.deepEqual(cache.log[0], { 'event': 'stale', 'key': 'a', 'value': 1 });
});

it('per-call staleMs override behaves like per-call ttlMs precedence', async () => {
  const cache = new RecordingCache({ 'capacity': 10 });
  cache.set('a', 1, { staleMs: 1 }); // no ttl, 1ms staleMs
  cache.log.length = 0;

  await new Promise<void>((resolve) => { setTimeout(resolve, 5); });

  const result = cache.get('a');
  assert.equal(result, 1);
  assert.deepEqual(cache.log[0], { 'event': 'stale', 'key': 'a', 'value': 1 });
});

it('once hard-expired, entry misses even if also stale (expire takes precedence over stale)', async () => {
  const cache = new RecordingCache({ 'capacity': 10, 'staleMs': 1, 'ttlMs': 2 });
  cache.set('a', 1);
  cache.log.length = 0;

  await new Promise<void>((resolve) => { setTimeout(resolve, 10); });

  const result = cache.get('a');
  assert.equal(result, undefined);
  assert.deepEqual(cache.log[0], { 'event': 'expire', 'key': 'a' });
  assert.deepEqual(cache.log[1], { 'event': 'miss', 'key': 'a' });
});

// ---------------------------------------------------------------------------
// deleteWhere — bulk/predicate invalidation
// ---------------------------------------------------------------------------

it('deleteWhere removes only matching entries and returns the correct count', () => {
  const cache = new RecordingCache({ 'capacity': 10 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.log.length = 0;

  const removed = cache.deleteWhere((_key, value) => { return value % 2 === 1; });

  assert.equal(removed, 2, 'a (1) and c (3) match');
  assert.equal(cache.has('a'), false);
  assert.equal(cache.has('b'), true);
  assert.equal(cache.has('c'), false);
  assert.equal(cache.size, 1);

  const deleteEvents = cache.log.filter((e) => { return e.event === 'delete'; });
  assert.equal(deleteEvents.length, 2);
});

it('deleteWhere is a no-op returning 0 when nothing matches', () => {
  const cache = new RecordingCache({ 'capacity': 10 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.log.length = 0;

  const removed = cache.deleteWhere(() => { return false; });

  assert.equal(removed, 0);
  assert.equal(cache.size, 2);
  assert.equal(cache.log.length, 0);
});

it('deleteWhere on an empty cache returns 0', () => {
  const cache = LruCache.create<string, number>({ capacity: 10 });
  const removed = cache.deleteWhere(() => { return true; });
  assert.equal(removed, 0);
});

it('a throwing onHit hook does not replace a successful get() result after promotion', () => {
  class ThrowingHitCache extends LruCache<string, number> {
    protected override onHit(): void {
      throw new Error('hook boom');
    }
  }

  const cache = new ThrowingHitCache({ 'capacity': 2 });
  cache.set('a', 1);
  cache.set('b', 2);

  assert.equal(cache.get('a'), 1);
  cache.set('c', 3);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), undefined);
});

it('a throwing onExpire hook does not replace lazy expiry removal', async () => {
  class ThrowingExpireCache extends LruCache<string, number> {
    protected override onExpire(): void {
      throw new Error('hook boom');
    }
  }

  const cache = new ThrowingExpireCache({ 'capacity': 10 });
  cache.set('a', 1, { 'ttlMs': 1 });
  await new Promise<void>((resolve) => { setTimeout(resolve, 5); });

  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.has('a'), false);
  assert.equal(cache.size, 0);
});

it('a throwing onUpdate hook does not replace the completed overwrite', () => {
  class ThrowingUpdateCache extends LruCache<string, number> {
    protected override onUpdate(): void {
      throw new Error('hook boom');
    }
  }

  const cache = new ThrowingUpdateCache({ 'capacity': 2 });
  cache.set('a', 1);
  cache.set('a', 2);

  assert.equal(cache.get('a'), 2);
});
