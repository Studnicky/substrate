import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  LOG_STATUS,
  STATUS_CATEGORIES
} from '../../src/constants/LOG_STATUS.js';
import { LogStatus } from '../../src/modules/LogStatus.js';
import scenarioGroups from './LogStatus.scenarios.json';

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-lifecycle-values' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-success-values' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-failure-values' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-retry-values' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-categories-lifecycle' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-categories-success' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-categories-failure' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'status-categories-retry' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-success-true' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-success-false' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-failure-true' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-failure-false' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-lifecycle-true' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'is-lifecycle-false' };

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function assertValues(scenarioCase: ScenarioCase, actual: readonly string[]): void {
  const expected = scenarioCase.expected as { values: string[] };
  assert.deepStrictEqual(actual, expected.values);
}

function assertPredicate(
  scenarioCase: ScenarioCase,
  predicate: (value: string) => boolean,
  expectedValue: boolean
): void {
  const expected = scenarioCase.expected as { values: string[] };
  for (const value of expected.values) {
    assert.strictEqual(predicate(value), expectedValue);
  }
}

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'is-failure-false': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isFailure, false);
  },
  'is-failure-true': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isFailure, true);
  },
  'is-lifecycle-false': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isLifecycle, false);
  },
  'is-lifecycle-true': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isLifecycle, true);
  },
  'is-success-false': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isSuccess, false);
  },
  'is-success-true': (scenarioCase) => {
    assertPredicate(scenarioCase, LogStatus.isSuccess, true);
  },
  'status-categories-failure': (scenarioCase) => {
    assertValues(scenarioCase, STATUS_CATEGORIES.FAILURE);
  },
  'status-categories-lifecycle': (scenarioCase) => {
    assertValues(scenarioCase, STATUS_CATEGORIES.LIFECYCLE);
  },
  'status-categories-retry': (scenarioCase) => {
    assertValues(scenarioCase, STATUS_CATEGORIES.RETRY);
  },
  'status-categories-success': (scenarioCase) => {
    assertValues(scenarioCase, STATUS_CATEGORIES.SUCCESS);
  },
  'status-failure-values': (scenarioCase) => {
    assertValues(scenarioCase, [
      LOG_STATUS.FAILED,
      LOG_STATUS.TIMEOUT,
      LOG_STATUS.INVALID,
      LOG_STATUS.NOT_FOUND,
      LOG_STATUS.UNAUTHORIZED,
      LOG_STATUS.RATE_LIMITED,
      LOG_STATUS.UNAVAILABLE
    ]);
  },
  'status-lifecycle-values': (scenarioCase) => {
    assertValues(scenarioCase, [
      LOG_STATUS.PENDING,
      LOG_STATUS.IN_PROGRESS,
      LOG_STATUS.COMPLETE
    ]);
  },
  'status-retry-values': (scenarioCase) => {
    assertValues(scenarioCase, [
      LOG_STATUS.RETRYING,
      LOG_STATUS.RETRY_EXHAUSTED
    ]);
  },
  'status-success-values': (scenarioCase) => {
    assertValues(scenarioCase, [
      LOG_STATUS.SUCCESS,
      LOG_STATUS.PARTIAL,
      LOG_STATUS.CACHED,
      LOG_STATUS.SKIPPED
    ]);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('LogStatus', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
