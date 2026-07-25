import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigurationError } from '@studnicky/config';

import { Throttle } from '../../../src/throttle/index.js';

type JsonThrottleConfig = { concurrencyLimit?: number | 'NaN' };

type ScenarioCase =
  | {
      description: string;
      expected: { concurrencyLimit: 10 };
      input: { throttle: JsonThrottleConfig };
      kind: 'default-config' | 'missing-concurrency-limit-uses-default';
      name: string;
    }
  | {
      description: string;
      expected: { concurrencyLimit: number };
      input: { throttle: JsonThrottleConfig };
      kind: 'custom-concurrency-limit';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: string };
      input: { throttle: JsonThrottleConfig };
      kind: 'invalid-concurrency-limit';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: string };
      input: { throttle: JsonThrottleConfig };
      kind: 'invalid-concurrency-limit-nan';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true; defaultAccepted: true };
      input: { throttle: JsonThrottleConfig };
      kind: 'accepts-valid-configuration';
      name: string;
    };

import scenarioGroups from './configuration.scenarios.json';

type ConcurrencyLimitKind = 'missing' | 'nan-token' | 'number';
type ThrottleConfigResolver = (config: JsonThrottleConfig) => Parameters<typeof Throttle.create>[0];

const concurrencyLimitKind = (config: JsonThrottleConfig): ConcurrencyLimitKind => {
  if (config.concurrencyLimit === 'NaN') return 'nan-token';
  if (config.concurrencyLimit === undefined) return 'missing';
  return 'number';
};

const throttleConfigResolverMap: Record<ConcurrencyLimitKind, ThrottleConfigResolver> = {
  missing: () => ({}),
  'nan-token': () => ({ concurrencyLimit: Number.NaN }),
  number: (config) => ({ concurrencyLimit: config.concurrencyLimit })
};

function resolveThrottleConfig(config: JsonThrottleConfig): Parameters<typeof Throttle.create>[0] {
  return throttleConfigResolverMap[concurrencyLimitKind(config)](config);
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => void> = {
  'accepts-valid-configuration': (scenarioCase) => {
    assert.doesNotThrow(() => { Throttle.create(resolveThrottleConfig(scenarioCase.input.throttle)); });
    assert.doesNotThrow(() => { Throttle.create(); });
    assert.equal(scenarioCase.expected.accepted, true);
    assert.equal(scenarioCase.expected.defaultAccepted, true);
  },
  'custom-concurrency-limit': (scenarioCase) => {
    const throttle = Throttle.create(resolveThrottleConfig(scenarioCase.input.throttle));
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  },
  'default-config': (scenarioCase) => {
    const throttle = Throttle.create();
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
    assert.deepStrictEqual(scenarioCase.input.throttle, {});
  },
  'invalid-concurrency-limit': (scenarioCase) => {
    assert.throws(() => { Throttle.create(resolveThrottleConfig(scenarioCase.input.throttle)); }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  },
  'invalid-concurrency-limit-nan': (scenarioCase) => {
    assert.strictEqual(scenarioCase.input.throttle.concurrencyLimit, 'NaN');
    assert.throws(() => { Throttle.create(resolveThrottleConfig(scenarioCase.input.throttle)); }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  },
  'missing-concurrency-limit-uses-default': (scenarioCase) => {
    const throttle = Throttle.create(resolveThrottleConfig(scenarioCase.input.throttle));
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }
};

void describe('Throttle configuration', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runnerMap[scenarioCase.kind](scenarioCase);
    });
  }
});
