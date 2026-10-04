import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { AsyncIter } from '../../src/AsyncIter.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import scenarioGroups from './AsyncIter.scenarios.json' with { 'type': 'json' };
import { AsyncIterScenarioCaseEntity } from './entities/AsyncIterScenarioCaseEntity.js';

class AsyncIterRunners {
  static async 'enrich-none'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'enrich-none'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.enrich<{ 'id': number }, { 'label': string }, { 'id': number; 'label'?: string }>(
        AsyncIterRunners.fromArray(scenarioCase.input.values),
        async () => { return await Promise.resolve(null); },
        (item, extra) => {
          const enriched = { 'id': item.id, 'label': extra.label };
          return enriched;
        }
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'enrich-partial'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'enrich-partial'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.enrich(
        AsyncIterRunners.fromArray(scenarioCase.input.values),
        async (item) => { return await Promise.resolve(item.id === 2 ? { 'label': 'found' } : null); },
        (item, extra) => {
          const enriched = { 'id': item.id, 'label': extra.label };
          return enriched;
        }
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'enrich-value'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'enrich-value'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.enrich(
        AsyncIterRunners.fromArray(scenarioCase.input.values),
        async (item) => { return await Promise.resolve({ 'label': `label-${item.id}` }); },
        (item, extra) => {
          const enriched = { 'id': item.id, 'label': extra.label };
          return enriched;
        }
      )
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'filter-all'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'filter-all'>): Promise<void> {
    const items = await Array.fromAsync(AsyncIter.filter(AsyncIterRunners.fromArray(scenarioCase.input.values), () => { return true; }));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'filter-async'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'filter-async'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.filter(AsyncIterRunners.fromArray(scenarioCase.input.values), async (value) => { return await Promise.resolve(value.length > scenarioCase.input.minLength); })
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'filter-empty'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'filter-empty'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.filter(AsyncIterRunners.fromArray(scenarioCase.input.values), (value) => {
        const keep = scenarioCase.input.predicate === 'even' ? value % 2 === 0 : true;
        return keep;
      })
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'filter-sync'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'filter-sync'>): Promise<void> {
    const items = await Array.fromAsync(
      AsyncIter.filter(AsyncIterRunners.fromArray(scenarioCase.input.values), (value) => {
        const keep = scenarioCase.input.predicate === 'even' ? value % 2 === 0 : true;
        return keep;
      })
    );
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'merge-empty'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'merge-empty'>): Promise<void> {
    const items = await Array.fromAsync(AsyncIter.merge(...AsyncIterRunners.makeNumberSources(scenarioCase.input.sources)));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'merge-high-volume'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'merge-high-volume'>): Promise<void> {
    const source: number[] = [];
    for (let index = 0; index < scenarioCase.input.batch.itemCount; index += 1) {
      source.push(index);
    }
    const items = await Array.fromAsync(AsyncIter.merge(AsyncIterRunners.fromArray(source)));
    assert.strictEqual(items.length, scenarioCase.expected.length);
    assert.strictEqual(items[0], scenarioCase.expected.first);
    assert.strictEqual(items[items.length - 1], scenarioCase.expected.last);
  }

  static async 'merge-propagates-error'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'merge-propagates-error'>): Promise<void> {
    const error = await ErrorCapture.rejection(
      Array.fromAsync(AsyncIter.merge(AsyncIterRunners.erroring(scenarioCase.input.errorMessage), ...AsyncIterRunners.makeNumberSources(scenarioCase.input.sources)))
    );
    assert.ok(error.message.includes(scenarioCase.expected.errorMessage));
  }

  static async 'merge-single'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'merge-single'>): Promise<void> {
    const items = await Array.fromAsync(AsyncIter.merge(...AsyncIterRunners.makeNumberSources(scenarioCase.input.sources)));
    assert.deepStrictEqual(items, scenarioCase.expected.items);
  }

  static async 'merge-two-sources'(scenarioCase: ScenarioCaseOfType<AsyncIterScenarioCaseEntity.Type, 'merge-two-sources'>): Promise<void> {
    const items = await Array.fromAsync(AsyncIter.merge(...AsyncIterRunners.makeNumberSources(scenarioCase.input.sources)));
    assert.strictEqual(items.length, scenarioCase.expected.length);
    const present = new Set(items);
    const includes = scenarioCase.expected.includes;
    for (let index = 0; index < includes.length; index += 1) {
      assert.ok(present.has(Number(includes[index])));
    }
  }

  private static async *erroring(errorMessage: string): AsyncGenerator<number> {
    yield await Promise.resolve(1);
    throw RuntimeError.create(errorMessage);
  }

  private static async *fromArray<T>(values: readonly T[]): AsyncGenerator<T> {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value !== undefined) {
        yield await Promise.resolve(value);
      }
    }
  }

  private static makeNumberSources(values: readonly (readonly number[])[]): AsyncGenerator<number>[] {
    const sources = values.map((source) => {
      const generator = AsyncIterRunners.fromArray(source);
      return generator;
    });
    return sources;
  }
}

ScenarioSuite.register({
  'entity': AsyncIterScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'AsyncIter',
  'runners': AsyncIterRunners
});
