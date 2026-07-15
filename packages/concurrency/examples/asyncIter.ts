/** asyncIter — demonstrates AsyncIter.merge, AsyncIter.filter, and AsyncIter.enrich. Run: npx tsx examples/asyncIter.ts */

import assert from 'node:assert/strict';

// #region usage
import { AsyncIter } from '../src/index.js';

// Native async sources — `async function*` is an AsyncIterable in browsers and
// Node alike, so AsyncIter's combinators consume them directly (no node:stream).
// Each awaits a microtask before yielding to model a genuinely asynchronous
// producer.
class AsyncSources {
  static async *range(start: number, end: number): AsyncGenerator<number> {
    for (let i = start; i <= end; i += 1) {
      await Promise.resolve();
      yield i;
    }
  }

  static async *words(items: string[]): AsyncGenerator<string> {
    for (const item of items) {
      await Promise.resolve();
      yield item;
    }
  }

  static async *itemsOf<T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      await Promise.resolve();
      yield item;
    }
  }
}

class AsyncIterDemo {
  static async runMerge(): Promise<void> {
    // Merge two non-overlapping ranges
    const merged = AsyncIter.merge(
      AsyncSources.range(1, 3),
      AsyncSources.range(10, 12)
    );
    const results: number[] = [];
    for await (const n of merged) {
      results.push(n);
    }

    // All 6 values present — order is arrival-based (FIFO within each source), so check membership
    assert.equal(results.length, 6);
    const expected = [1, 2, 3, 10, 11, 12];
    const expectedLen = expected.length;

    for (let i = 0; i < expectedLen; i += 1) {
      assert.ok(results.includes(expected[i]!), `Missing value ${expected[i]}`);
    }
    // Within each source, relative order is preserved
    assert.ok(results.indexOf(1) < results.indexOf(2));
    assert.ok(results.indexOf(2) < results.indexOf(3));
    assert.ok(results.indexOf(10) < results.indexOf(11));
    assert.ok(results.indexOf(11) < results.indexOf(12));

    console.log('merge results:', results);
  }

  static async runMergeEmpty(): Promise<void> {
    const results: number[] = [];
    for await (const n of AsyncIter.merge<number>()) {
      results.push(n);
    }
    assert.equal(results.length, 0);
    console.log('merge empty: []');
  }

  static async runFilter(): Promise<void> {
    const evens = AsyncIter.filter(AsyncSources.range(1, 10), (n) => { return n % 2 === 0; });
    const results: number[] = [];
    for await (const n of evens) {
      results.push(n);
    }
    assert.deepEqual(results, [2, 4, 6, 8, 10]);
    console.log('filter evens:', results);
  }

  static async runFilterAsync(): Promise<void> {
    // Predicate may return a Promise
    const longWords = AsyncIter.filter(
      AsyncSources.words(['hi', 'hello', 'hey', 'greetings']),
      async (w) => { const result = await Promise.resolve(w.length > 3); return result; }
    );
    const results: string[] = [];
    for await (const w of longWords) {
      results.push(w);
    }
    assert.deepEqual(results, ['hello', 'greetings']);
    console.log('filter long words:', results);
  }

  static async runEnrich(): Promise<void> {
    type Item = { 'id': number };
    type Enrichment = { 'label': string };
    type Enriched = { 'id': number; 'label': string };

    const items = AsyncSources.itemsOf<Item>([{ 'id': 1 }, { 'id': 2 }, { 'id': 3 }]);

    // Only even ids get enrichment; odd ids pass through unchanged
    const enriched = AsyncIter.enrich<Item, Enrichment, Enriched>(
      items,
      (item) => { const result = Promise.resolve(item.id % 2 === 0 ? { 'label': `even-${item.id}` } : null); return result; },
      (item, enrichment) => { return { 'id': item.id, 'label': enrichment.label }; }
    );

    const results: (Item | Enriched)[] = [];
    for await (const item of enriched) {
      results.push(item);
    }

    assert.equal(results.length, 3);

    // id:1 — unenriched, passes through as-is
    assert.deepEqual(results[0], { 'id': 1 });

    // id:2 — enriched
    assert.deepEqual(results[1], { 'id': 2, 'label': 'even-2' });

    // id:3 — unenriched
    assert.deepEqual(results[2], { 'id': 3 });

    console.log('enrich results:', results);
  }

  static async runMergeFilterEnrichPipeline(): Promise<void> {
    // Compose all three combinators in a pipeline
    const merged = AsyncIter.merge<number>(
      AsyncSources.range(1, 5),
      AsyncSources.range(6, 10)
    );
    const filtered = AsyncIter.filter<number>(merged, (n) => { return n % 3 === 0; });
    const enriched = AsyncIter.enrich<number, { 'tier': string }, { 'n': number; 'tier': string }>(
      filtered,
      (n) => { const result = Promise.resolve(n > 5 ? { 'tier': 'high' as const } : null); return result; },
      (n, e) => { return { 'n': n, 'tier': e.tier }; }
    );

    const results: ({ 'n': number; 'tier': string } | number)[] = [];
    for await (const item of enriched) {
      results.push(item);
    }

    // Multiples of 3 in 1..10: 3, 6, 9
    // 3 → unenriched (≤5)
    // 6 → enriched { n:6, tier:'high' }
    // 9 → enriched { n:9, tier:'high' }
    // merge() yields in arrival order across concurrent sources — sort for stable assertions
    const sorted = [...results].sort((a, b) => {
      const nA = typeof a === 'number' ? a : a.n;
      const nB = typeof b === 'number' ? b : b.n;
      return nA - nB;
    });
    assert.equal(sorted.length, 3);
    assert.deepEqual(sorted[0], 3);
    assert.deepEqual(sorted[1], { 'n': 6, 'tier': 'high' });
    assert.deepEqual(sorted[2], { 'n': 9, 'tier': 'high' });

    console.log('merge+filter+enrich pipeline:', sorted);
  }
}
// #endregion usage

await AsyncIterDemo.runMerge();
await AsyncIterDemo.runMergeEmpty();
await AsyncIterDemo.runFilter();
await AsyncIterDemo.runFilterAsync();
await AsyncIterDemo.runEnrich();
await AsyncIterDemo.runMergeFilterEnrichPipeline();

console.log('asyncIter: all assertions passed');
