import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AsyncIter } from '../../src/AsyncIter.js';

async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) { items.push(item); }
  return items;
}

async function* fromArray<T>(arr: T[]): AsyncGenerator<T> {
  for (const item of arr) { yield item; }
}

describe('AsyncIter.merge', () => {
  it('returns immediately for zero sources', async () => {
    const items = await collect(AsyncIter.merge());
    assert.deepEqual(items, []);
  });

  it('merges a single source', async () => {
    const items = await collect(AsyncIter.merge(fromArray([1, 2, 3])));
    assert.deepEqual(items, [1, 2, 3]);
  });

  it('merges two sources (all items present, order may vary)', async () => {
    const items = await collect(
      AsyncIter.merge(fromArray([1, 2]), fromArray([3, 4]))
    );
    assert.equal(items.length, 4);
    assert.ok(items.includes(1));
    assert.ok(items.includes(2));
    assert.ok(items.includes(3));
    assert.ok(items.includes(4));
  });

  it('first error from any source propagates', async () => {
    async function* erroring(): AsyncGenerator<number> {
      yield 1;
      throw new Error('source-error');
    }

    await assert.rejects(
      () => collect(AsyncIter.merge(erroring(), fromArray([2, 3]))),
      /source-error/
    );
  });
});

describe('AsyncIter.filter', () => {
  it('passes items matching a sync predicate', async () => {
    const items = await collect(
      AsyncIter.filter(fromArray([1, 2, 3, 4, 5]), (n) => n % 2 === 0)
    );
    assert.deepEqual(items, [2, 4]);
  });

  it('skips all items when predicate returns false for all', async () => {
    const items = await collect(
      AsyncIter.filter(fromArray([1, 3, 5]), (n) => n % 2 === 0)
    );
    assert.deepEqual(items, []);
  });

  it('async predicate works', async () => {
    const items = await collect(
      AsyncIter.filter(
        fromArray(['a', 'bb', 'ccc']),
        async (s) => Promise.resolve(s.length > 1)
      )
    );
    assert.deepEqual(items, ['bb', 'ccc']);
  });

  it('passes through all items when predicate returns true for all', async () => {
    const items = await collect(
      AsyncIter.filter(fromArray([1, 2, 3]), () => true)
    );
    assert.deepEqual(items, [1, 2, 3]);
  });
});

describe('AsyncIter.enrich', () => {
  interface Item { id: number }
  interface Extra { label: string }
  interface Enriched { id: number; label: string }

  it('enriches when lookup returns a value', async () => {
    const items = await collect(
      AsyncIter.enrich<Item, Extra, Enriched>(
        fromArray([{ id: 1 }, { id: 2 }]),
        async (item) => ({ label: `label-${item.id}` }),
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepEqual(items, [
      { id: 1, label: 'label-1' },
      { id: 2, label: 'label-2' },
    ]);
  });

  it('passes through original item when lookup returns null', async () => {
    const items = await collect(
      AsyncIter.enrich<Item, Extra, Enriched>(
        fromArray([{ id: 1 }, { id: 2 }]),
        async (item) => item.id === 2 ? { label: 'found' } : null,
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepEqual(items, [
      { id: 1 },
      { id: 2, label: 'found' },
    ]);
  });

  it('passes through all items when lookup always returns null', async () => {
    const items = await collect(
      AsyncIter.enrich<Item, Extra, Enriched>(
        fromArray([{ id: 1 }, { id: 2 }]),
        async () => null,
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
  });
});
