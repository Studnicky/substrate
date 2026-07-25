import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigurationError } from '@studnicky/config';

import { backoffStrategy } from '../../../src/retry/config/schemas/index.js';
import scenarioGroups from './backoff-strategy.scenarios.json';

type BackoffStrategyInputSource = 'backoff-strategy' | 'value';

type ScenarioCase =
  {
    description: string;
    expected: { accepted?: true; errorName?: 'ConfigurationError' };
    input: { backoffStrategy?: { baseDelayMs?: unknown; strategyResult: number }; source: BackoffStrategyInputSource; value?: unknown };
    kind:
      | 'accepts-empty'
      | 'accepts-null'
      | 'accepts-valid'
      | 'rejects-bad-base-delay-with-function-strategy'
      | 'rejects-missing-base-delay'
      | 'rejects-missing-strategy'
      | 'rejects-non-object';
    name: string;
  };

const inputResolverMap: Record<BackoffStrategyInputSource, (input: ScenarioCase['input']) => unknown> = {
  'backoff-strategy': (input) => ({
    'baseDelayMs': input.backoffStrategy?.baseDelayMs,
    'strategy': () => input.backoffStrategy?.strategyResult
  }),
  'value': (input) => input.value
};

function resolveBackoffStrategyInput(input: ScenarioCase['input']): unknown {
  return inputResolverMap[input.source](input);
}

function assertAccepted(scenarioCase: ScenarioCase): void {
  assert.doesNotThrow(() => {
    backoffStrategy.validateBackoffStrategy(resolveBackoffStrategyInput(scenarioCase.input));
  });
  assert.strictEqual(scenarioCase.expected.accepted, true);
}

function assertRejected(scenarioCase: ScenarioCase): void {
  assert.throws(() => {
    backoffStrategy.validateBackoffStrategy(resolveBackoffStrategyInput(scenarioCase.input));
  }, ConfigurationError);
  assert.strictEqual(scenarioCase.expected.errorName, 'ConfigurationError');
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => void> = {
  'accepts-empty': assertAccepted,
  'accepts-null': assertAccepted,
  'accepts-valid': assertAccepted,
  'rejects-bad-base-delay-with-function-strategy': assertRejected,
  'rejects-missing-base-delay': assertRejected,
  'rejects-missing-strategy': assertRejected,
  'rejects-non-object': assertRejected
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Retry backoffStrategy schema', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
