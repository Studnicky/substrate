/** observedCache — subclass overrides emit console.log trace lines on every cache event. Run: npx tsx examples/observedCache.ts */

import assert from 'node:assert/strict';

// #region usage
import { LruCache } from '../src/index.js';

class TracingCache extends LruCache<string, number> {
  readonly events: { 'event': string; 'key'?: string }[] = [];

  constructor(options: { 'capacity': number; 'ttlMs'?: number }) {
    super(options);
  }

  protected override onHit(key: string, value: number): void {
    this.events.push({ 'event': 'hit', 'key': key });
    console.log(`[cache] hit   key=${key} value=${value}`);
  }

  protected override onMiss(key: string): void {
    this.events.push({ 'event': 'miss', 'key': key });
    console.log(`[cache] miss  key=${key}`);
  }

  protected override onSet(key: string): void {
    this.events.push({ 'event': 'set', 'key': key });
    console.log(`[cache] set   key=${key}`);
  }

  protected override onUpdate(key: string): void {
    this.events.push({ 'event': 'update', 'key': key });
    console.log(`[cache] update key=${key}`);
  }

  protected override onEvict(key: string, reason: 'capacity'): void {
    this.events.push({ 'event': 'evict', 'key': key });
    console.log(`[cache] evict key=${key} reason=${reason}`);
  }

  protected override onExpire(key: string): void {
    this.events.push({ 'event': 'expire', 'key': key });
    console.log(`[cache] expire key=${key}`);
  }

  protected override onDelete(key: string): void {
    this.events.push({ 'event': 'delete', 'key': key });
    console.log(`[cache] delete key=${key}`);
  }

  protected override onClear(count: number): void {
    this.events.push({ 'event': 'clear' });
    console.log(`[cache] clear  count=${count}`);
  }

  eventNames(): string[] {
    const result: string[] = [];
    for (const e of this.events) {
      result.push(e.event);
    }
    return result;
  }
}

// Capacity-2 cache; demonstrates set, hit, miss, update, evict
const cache = new TracingCache({ 'capacity': 2, 'ttlMs': 5_000 });

cache.set('a', 1);       // onSet(a)
cache.set('b', 2);       // onSet(b)
cache.get('a');           // onHit(a, 1)
cache.set('a', 99);      // onUpdate(a)
cache.set('c', 3);       // onEvict(b, capacity) then onSet(c)
cache.get('b');           // onMiss(b) — evicted
cache.delete('c');        // onDelete(c)
cache.set('d', 4);       // onSet(d)
cache.clear();            // onClear(2)

// TTL expiry scenario
const ttlCache = new TracingCache({ 'capacity': 10 });
ttlCache.events.length = 0;
ttlCache.set('ttl-key', 7, { 'ttlMs': 1 }); // 1 ms TTL
await new Promise<void>((resolve) => { setTimeout(resolve, 5); });
ttlCache.get('ttl-key'); // onExpire then onMiss
// #endregion usage

// ---- assertions ----

assert.deepEqual(cache.eventNames(), [
  'set',    // set('a', 1)
  'set',    // set('b', 2)
  'hit',    // get('a')
  'update', // set('a', 99) — existing key
  'evict',  // b evicted for capacity
  'set',    // set('c', 3)
  'miss',   // get('b') — was evicted
  'delete', // delete('c')
  'set',    // set('d', 4)
  'clear'   // clear()
]);

assert.deepEqual(ttlCache.eventNames(), ['set', 'expire', 'miss']);

console.log('observedCache: all assertions passed');
