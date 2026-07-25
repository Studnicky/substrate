import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AsyncIter } from '../../src/AsyncIter.js';
import scenarioGroups from './AsyncIter.scenarios.json';

async function collect<T>(gen: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

async function* fromArray<T>(arr: T[]): AsyncGenerator<T> {
  for (const item of arr) {
    yield item;
  }
}

type BatchInput = {
  itemCount: number;
};

type ScenarioCase =
  | {
      description: string;
      expected: { items: number[] };
      input: { sources: number[][] };
      shape: 'merge-empty' | 'merge-single';
      name: string;
    }
  | {
      description: string;
      expected: { includes: number[]; length: number };
      input: { sources: number[][] };
      shape: 'merge-two-sources';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessage: string };
      input: { errorMessage: string; sources: number[][] };
      shape: 'merge-propagates-error';
      name: string;
    }
  | {
      description: string;
      expected: { first: number; last: number; length: number };
      input: { batch: BatchInput };
      shape: 'merge-high-volume';
      name: string;
    }
  | {
      description: string;
      expected: { items: number[] };
      input: { predicate: 'even' | 'all'; values: number[] };
      shape: 'filter-sync' | 'filter-empty' | 'filter-all';
      name: string;
    }
  | {
      description: string;
      expected: { items: string[] };
      input: { minLength: number; values: string[] };
      shape: 'filter-async';
      name: string;
    }
  | {
      description: string;
      expected: { items: Array<{ id: number; label?: string }> };
      input: { values: Array<{ id: number }> };
      shape: 'enrich-value' | 'enrich-partial' | 'enrich-none';
      name: string;
    };

function makeNumberSources(values: number[][]): AsyncGenerator<number>[] {
  return values.map((source) => fromArray(source));
}

function createNumberBatch(batch: BatchInput): number[] {
  return Array.from({ length: batch.itemCount }, (_v, index) => index);
}

function assertErrorMessageIncludes(error: unknown, expectedMessage: string): void {
  assert.ok(error instanceof Error);
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'enrich-none': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.enrich(
        fromArray(scenarioCase.input.values),
        async () => null,
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'enrich-partial': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.enrich(
        fromArray(scenarioCase.input.values),
        async (item) => (item.id === 2 ? { label: 'found' } : null),
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'enrich-value': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.enrich(
        fromArray(scenarioCase.input.values),
        async (item) => ({ label: `label-${item.id}` }),
        (item, extra) => ({ id: item.id, label: extra.label })
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'filter-all': async (scenarioCase) => {
    const items = await collect(AsyncIter.filter(fromArray(scenarioCase.input.values), () => true));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'filter-async': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.filter(fromArray(scenarioCase.input.values), async (s) => Promise.resolve((s as string).length > scenarioCase.input.minLength))
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'filter-empty': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.filter(fromArray(scenarioCase.input.values), (n) => {
        return scenarioCase.input.predicate === 'even' ? (n as number) % 2 === 0 : true;
      })
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'filter-sync': async (scenarioCase) => {
    const items = await collect(
      AsyncIter.filter(fromArray(scenarioCase.input.values), (n) => {
        return scenarioCase.input.predicate === 'even' ? (n as number) % 2 === 0 : true;
      })
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'merge-empty': async (scenarioCase) => {
    const items = await collect(AsyncIter.merge(...makeNumberSources(scenarioCase.input.sources)));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'merge-high-volume': async (scenarioCase) => {
    const source = createNumberBatch(scenarioCase.input.batch);
    const items = await collect(AsyncIter.merge(fromArray(source)));
    assert.strictEqual(items.length, scenarioCase.expected.length);
    assert.strictEqual(items[0], scenarioCase.expected.first);
    assert.strictEqual(items[items.length - 1], scenarioCase.expected.last);
  },
  'merge-propagates-error': async (scenarioCase) => {
    async function* erroring(): AsyncGenerator<number> {
      yield 1;
      throw new Error(scenarioCase.input.errorMessage);
    }
    await assert.rejects(() => collect(AsyncIter.merge(erroring(), ...makeNumberSources(scenarioCase.input.sources))), (error: unknown) => {
      assertErrorMessageIncludes(error, scenarioCase.expected.errorMessage);
      return true;
    });
  },
  'merge-single': async (scenarioCase) => {
    const items = await collect(AsyncIter.merge(...makeNumberSources(scenarioCase.input.sources)));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  },
  'merge-two-sources': async (scenarioCase) => {
    const items = await collect(AsyncIter.merge(...makeNumberSources(scenarioCase.input.sources)));
    assert.strictEqual(items.length, scenarioCase.expected.length);
    for (const value of scenarioCase.expected.includes) {
      assert.ok(items.includes(value));
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('AsyncIter', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
