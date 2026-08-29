import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import type { BatchStatsEntity } from '../../../src/entities/BatchStatsEntity.js';
import { Batch } from '../../../src/index.js';
import scenarioGroups from './ContinuousBatch.scenarios.json' with { type: 'json' };

type ImmediateRefillScenarioCase = {
  readonly 'expected': { readonly 'refilledBeforeSlowestFinished': boolean; readonly 'results': readonly number[] };
  readonly 'input': { readonly 'fastDelayMs': number; readonly 'items': readonly number[]; readonly 'maximumConcurrent': number; readonly 'slowDelayMs': number };
  readonly 'name': string;
  readonly 'shape': 'immediate-refill';
};

type SettledResultsScenarioCase = {
  readonly 'expected': { readonly 'statuses': readonly ('fulfilled' | 'rejected')[] };
  readonly 'input': { readonly 'failure': number; readonly 'items': readonly number[]; readonly 'maximumConcurrent': number };
  readonly 'name': string;
  readonly 'shape': 'settled-results';
};

type EmptyInputScenarioCase = {
  readonly 'expected': { readonly 'batchCompleteCount': number; readonly 'batchStartCount': number; readonly 'results': readonly number[] };
  readonly 'input': { readonly 'items': readonly number[]; readonly 'maximumConcurrent': number };
  readonly 'name': string;
  readonly 'shape': 'empty-input';
};

type FailFastCompletionScenarioCase = {
  readonly 'expected': { readonly 'rejectedMessage': string; readonly 'stats': BatchStatsEntity.Type };
  readonly 'input': { readonly 'failure': number; readonly 'items': readonly number[]; readonly 'maximumConcurrent': number };
  readonly 'name': string;
  readonly 'shape': 'fail-fast-completion';
};

type ScenarioCase = EmptyInputScenarioCase | FailFastCompletionScenarioCase | ImmediateRefillScenarioCase | SettledResultsScenarioCase;

class LifecycleBatch extends Batch<number> {
  public batchCompleteStats: BatchStatsEntity.Type[] = [];
  public batchStartCount = 0;

  public constructor(maximumConcurrent: number) {
    super(maximumConcurrent);
  }

  protected override onBatchStart(): void {
    this.batchStartCount += 1;
  }

  protected override onBatchComplete(stats: BatchStatsEntity.Type): void {
    this.batchCompleteStats.push(stats);
  }
}

function requireBoolean(value: unknown, name: string): boolean {
  if (!Predicates.isBoolean(value)) {
    throw new TypeError(`${name} must be a boolean`);
  }
  return value;
}

function requireNonNegativeNumber(value: unknown, name: string): number {
  if (!Predicates.isNumber(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative number`);
  }
  return value;
}

function requireNumberArray(value: unknown, name: string): readonly number[] {
  if (!Predicates.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
  const result: number[] = [];
  for (const item of value) {
    result.push(requireNonNegativeNumber(item, name));
  }
  return result;
}

function requireRecord(value: unknown, name: string): Record<string, unknown> {
  if (!Predicates.isObject(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function requireStatusArray(value: unknown): readonly ('fulfilled' | 'rejected')[] {
  if (!Predicates.isArray(value)) {
    throw new TypeError('scenario expected statuses must be an array');
  }
  const result: ('fulfilled' | 'rejected')[] = [];
  for (const item of value) {
    if (item === 'fulfilled' || item === 'rejected') {
      result.push(item);
      continue;
    }
    throw new TypeError('scenario expected statuses must contain settlement statuses');
  }
  return result;
}

function requireString(value: unknown, name: string): string {
  if (!Predicates.isString(value)) {
    throw new TypeError(`${name} must be a string`);
  }
  return value;
}

function requireStats(value: unknown): BatchStatsEntity.Type {
  const record = requireRecord(value, 'scenario expected stats');
  return {
    'failed': requireNonNegativeNumber(record['failed'], 'scenario expected stats failed'),
    'succeeded': requireNonNegativeNumber(record['succeeded'], 'scenario expected stats succeeded'),
    'total': requireNonNegativeNumber(record['total'], 'scenario expected stats total')
  };
}

function parseScenarioCase(value: unknown): ScenarioCase {
  const record = requireRecord(value, 'scenario case');
  const expected = requireRecord(record['expected'], 'scenario expected');
  const input = requireRecord(record['input'], 'scenario input');
  const maximumConcurrent = requireNonNegativeNumber(input['maximumConcurrent'], 'scenario input maximumConcurrent');
  if (maximumConcurrent === 0) {
    throw new TypeError('scenario input maximumConcurrent must be positive');
  }
  const name = requireString(record['name'], 'scenario name');
  const shape = requireString(record['shape'], 'scenario shape');
  const normalizedInput = {
    'items': requireNumberArray(input['items'], 'scenario input items'),
    'maximumConcurrent': maximumConcurrent
  };

  if (shape === 'immediate-refill') {
    return {
      'expected': {
        'refilledBeforeSlowestFinished': requireBoolean(expected['refilledBeforeSlowestFinished'], 'scenario expected refilledBeforeSlowestFinished'),
        'results': requireNumberArray(expected['results'], 'scenario expected results')
      },
      'input': {
        ...normalizedInput,
        'fastDelayMs': requireNonNegativeNumber(input['fastDelayMs'], 'scenario input fastDelayMs'),
        'slowDelayMs': requireNonNegativeNumber(input['slowDelayMs'], 'scenario input slowDelayMs')
      },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'settled-results') {
    return {
      'expected': { 'statuses': requireStatusArray(expected['statuses']) },
      'input': { ...normalizedInput, 'failure': requireNonNegativeNumber(input['failure'], 'scenario input failure') },
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'empty-input') {
    return {
      'expected': {
        'batchCompleteCount': requireNonNegativeNumber(expected['batchCompleteCount'], 'scenario expected batchCompleteCount'),
        'batchStartCount': requireNonNegativeNumber(expected['batchStartCount'], 'scenario expected batchStartCount'),
        'results': requireNumberArray(expected['results'], 'scenario expected results')
      },
      'input': normalizedInput,
      'name': name,
      'shape': shape
    };
  }

  if (shape === 'fail-fast-completion') {
    return {
      'expected': {
        'rejectedMessage': requireString(expected['rejectedMessage'], 'scenario expected rejectedMessage'),
        'stats': requireStats(expected['stats'])
      },
      'input': { ...normalizedInput, 'failure': requireNonNegativeNumber(input['failure'], 'scenario input failure') },
      'name': name,
      'shape': shape
    };
  }

  throw new TypeError(`Unknown continuous batch scenario shape: ${shape}`);
}

function parseScenarioCases(value: unknown): readonly ScenarioCase[] {
  const record = requireRecord(value, 'scenario groups');
  const cases = record['cases'];
  if (!Predicates.isArray(cases)) {
    throw new TypeError('scenario groups cases must be an array');
  }
  const result: ScenarioCase[] = [];
  for (const scenarioCase of cases) {
    result.push(parseScenarioCase(scenarioCase));
  }
  return result;
}

const scenarioCases = parseScenarioCases(scenarioGroups);

void describe('Batch continuous operations', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      switch (scenarioCase.shape) {
        case 'immediate-refill': {
          const events: string[] = [];
          const results = await Batch.create<number>(scenarioCase.input.maximumConcurrent).processContinuous(
            scenarioCase.input.items,
            async (item): Promise<number> => {
              events.push(`start-${item}`);
              const delay = item === 1 ? scenarioCase.input.slowDelayMs : item === 2 ? scenarioCase.input.fastDelayMs : 0;
              await new Promise<void>((resolve) => { setTimeout(resolve, delay); });
              events.push(`end-${item}`);
              return item * 10;
            },
          );
          assert.deepEqual(results, scenarioCase.expected.results);
          assert.equal(events.indexOf('start-3') < events.indexOf('end-1'), scenarioCase.expected.refilledBeforeSlowestFinished);
          return;
        }
        case 'settled-results': {
          const results = await Batch.create<number>(scenarioCase.input.maximumConcurrent).processContinuousSettled(
            scenarioCase.input.items,
            async (item): Promise<number> => {
              if (item === scenarioCase.input.failure) {
                throw new Error('failed item');
              }
              return item;
            },
          );
          assert.deepEqual(results.map((result) => { return result.status; }), scenarioCase.expected.statuses);
          return;
        }
        case 'empty-input': {
          const batch = new LifecycleBatch(scenarioCase.input.maximumConcurrent);
          const results = await batch.processContinuous(scenarioCase.input.items, async (item): Promise<number> => item);
          assert.deepEqual(results, scenarioCase.expected.results);
          assert.equal(batch.batchStartCount, scenarioCase.expected.batchStartCount);
          assert.equal(batch.batchCompleteStats.length, scenarioCase.expected.batchCompleteCount);
          return;
        }
        case 'fail-fast-completion': {
          const batch = new LifecycleBatch(scenarioCase.input.maximumConcurrent);
          await assert.rejects(
            batch.processContinuous(scenarioCase.input.items, async (item): Promise<number> => {
              if (item === scenarioCase.input.failure) {
                throw new Error('failed item');
              }
              return item;
            }),
            new Error(scenarioCase.expected.rejectedMessage)
          );
          assert.deepEqual(batch.batchCompleteStats, [scenarioCase.expected.stats]);
          return;
        }
      }
    });
  }
});
