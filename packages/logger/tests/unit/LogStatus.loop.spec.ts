import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  LOG_STATUS,
  STATUS_CATEGORIES
} from '../../src/constants/LOG_STATUS.js';
import { LogStatusEntity } from '../../src/entities/LogStatusEntity.js';
import { LogStatus } from '../../src/modules/LogStatus.js';
import { LogStatusScenarioCaseEntity } from './entities/LogStatusScenarioCaseEntity.js';
import scenarioGroups from './LogStatus.scenarios.json' with { type: 'json' };

type ScenarioCase = LogStatusScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(LogStatusScenarioCaseEntity.Schema, LogStatusScenarioCaseEntity.Node);

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function assertValues(scenarioCase: ScenarioCase, actual: readonly string[]): void {
  assert.deepStrictEqual(actual, scenarioCase.expected.values);
}

function assertPredicate(
  scenarioCase: ScenarioCase,
  predicate: (value: LogStatusEntity.Type) => boolean,
  expectedValue: boolean
): void {
  for (const value of scenarioCase.expected.values) {
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
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
