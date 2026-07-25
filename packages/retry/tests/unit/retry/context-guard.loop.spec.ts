import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RetryContextGuard } from '../../../src/index.js';
import scenarioGroups from './context-guard.scenarios.json';

type ScenarioInput = {
  override?: Record<string, unknown>;
  source: 'direct' | 'valid-context';
  value?: unknown;
};

type ScenarioCase =
  | {
      description: string;
      expected: { result: boolean };
      input: ScenarioInput;
      kind:
        | 'accept-valid-context'
        | 'reject-bad-attempt-number'
        | 'reject-bad-classification'
        | 'reject-bad-elapsed-ms'
        | 'reject-bad-error'
        | 'reject-bad-max-retries'
        | 'reject-bad-state'
        | 'reject-bad-stats'
        | 'reject-non-object';
      name: string;
    };

function createValidContext(): Record<string, unknown> {
  return {
    'attemptNumber': 1,
    'classification': { 'retryable': true },
    'delayMs': 0,
    'elapsedMs': 10,
    'error': new Error('boom'),
    'maxRetries': 3,
    'state': {},
    'stats': {
      'failedRequests': 0,
      'successfulRequests': 0,
      'totalRequests': 1,
      'totalRetries': 0
    }
  };
}

const inputResolverMap: Record<ScenarioInput['source'], (input: ScenarioInput) => unknown> = {
  'direct': (input) => input.value,
  'valid-context': (input) => ({ ...createValidContext(), ...input.override })
};

function resolveContextInput(input: ScenarioInput): unknown {
  return inputResolverMap[input.source](input);
}

function assertRetryContext(scenarioCase: ScenarioCase): void {
  assert.strictEqual(RetryContextGuard.isRetryContext(resolveContextInput(scenarioCase.input)), scenarioCase.expected.result);
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => void> = {
  'accept-valid-context': assertRetryContext,
  'reject-bad-attempt-number': assertRetryContext,
  'reject-bad-classification': assertRetryContext,
  'reject-bad-elapsed-ms': assertRetryContext,
  'reject-bad-error': assertRetryContext,
  'reject-bad-max-retries': assertRetryContext,
  'reject-bad-state': assertRetryContext,
  'reject-bad-stats': assertRetryContext,
  'reject-non-object': assertRetryContext
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('RetryContextGuard', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
