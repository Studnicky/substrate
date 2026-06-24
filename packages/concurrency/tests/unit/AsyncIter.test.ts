import { it } from 'node:test';
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

const mergeScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'returns immediately for zero sources',
    exec: async () => {
      const items = await collect(AsyncIter.merge());
      assert.deepEqual(items, []);
    },
  },
  {
    description: 'merges a single source',
    exec: async () => {
      const items = await collect(AsyncIter.merge(fromArray([1, 2, 3])));
      assert.deepEqual(items, [1, 2, 3]);
    },
  },
  {
    description: 'merges two sources (all items present, order may vary)',
    exec: async () => {
      const items = await collect(
        AsyncIter.merge(fromArray([1, 2]), fromArray([3, 4]))
      );
      assert.equal(items.length, 4);
      assert.ok(items.includes(1));
      assert.ok(items.includes(2));
      assert.ok(items.includes(3));
      assert.ok(items.includes(4));
    },
  },
  {
    description: 'first error from any source propagates',
    exec: async () => {
      async function* erroring(): AsyncGenerator<number> {
        yield 1;
        throw new Error('source-error');
      }

      await assert.rejects(
        () => collect(AsyncIter.merge(erroring(), fromArray([2, 3]))),
        /source-error/
      );
    },
  },
];
for (const { description, exec } of mergeScenarios) {
  it(description, exec);
}

interface FilterScenario<T> {
  description: string;
  input: T[];
  predicate: (item: T) => boolean | Promise<boolean>;
  expected: T[];
}

const filterScenarios: Array<FilterScenario<number | string>> = [
  {
    description: 'passes items matching a sync predicate',
    input: [1, 2, 3, 4, 5],
    predicate: (n) => (n as number) % 2 === 0,
    expected: [2, 4],
  },
  {
    description: 'skips all items when predicate returns false for all',
    input: [1, 3, 5],
    predicate: (n) => (n as number) % 2 === 0,
    expected: [],
  },
  {
    description: 'async predicate works',
    input: ['a', 'bb', 'ccc'],
    predicate: async (s) => Promise.resolve((s as string).length > 1),
    expected: ['bb', 'ccc'],
  },
  {
    description: 'passes through all items when predicate returns true for all',
    input: [1, 2, 3],
    predicate: () => true,
    expected: [1, 2, 3],
  },
];
for (const { description, input, predicate, expected } of filterScenarios) {
  it(description, async () => {
    const items = await collect(AsyncIter.filter(fromArray(input), predicate));
    assert.deepEqual(items, expected);
  });
}

interface Item { id: number }
interface Extra { label: string }
interface Enriched { id: number; label?: string }

interface EnrichScenario {
  description: string;
  input: Item[];
  lookup: (item: Item) => Promise<Extra | null>;
  expected: Enriched[];
}

const enrichScenarios: Array<EnrichScenario> = [
  {
    description: 'enriches when lookup returns a value',
    input: [{ id: 1 }, { id: 2 }],
    lookup: async (item) => ({ label: `label-${item.id}` }),
    expected: [
      { id: 1, label: 'label-1' },
      { id: 2, label: 'label-2' },
    ],
  },
  {
    description: 'passes through original item when lookup returns null',
    input: [{ id: 1 }, { id: 2 }],
    lookup: async (item) => item.id === 2 ? { label: 'found' } : null,
    expected: [
      { id: 1 },
      { id: 2, label: 'found' },
    ],
  },
  {
    description: 'passes through all items when lookup always returns null',
    input: [{ id: 1 }, { id: 2 }],
    lookup: async () => null,
    expected: [{ id: 1 }, { id: 2 }],
  },
];
for (const { description, input, lookup, expected } of enrichScenarios) {
  it(description, async () => {
    const items = await collect(
      AsyncIter.enrich<Item, Extra, Enriched>(
        fromArray(input),
        lookup,
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepEqual(items, expected);
  });
}
