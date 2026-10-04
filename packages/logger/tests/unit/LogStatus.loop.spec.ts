import assert from 'node:assert/strict';

import type { LogStatusEntity } from '../../src/entities/LogStatusEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LOG_STATUS, STATUS_CATEGORIES } from '../../src/constants/LOG_STATUS.js';
import { LogStatus } from '../../src/modules/LogStatus.js';
import { LogStatusScenarioCaseEntity } from './entities/LogStatusScenarioCaseEntity.js';
import scenarioGroups from './LogStatus.scenarios.json' with { 'type': 'json' };

class LogStatusRunners {
  static assertValues(
    scenarioCase: LogStatusScenarioCaseEntity.Type,
    actual: readonly string[]
  ): void {
    assert.deepStrictEqual(actual, scenarioCase.expected.values);
  }

  static assertPredicate(
    scenarioCase: LogStatusScenarioCaseEntity.Type,
    predicate: (value: LogStatusEntity.Type) => boolean,
    expectedValue: boolean
  ): void {
    for (let index = 0; index < scenarioCase.expected.values.length; index += 1) {
      const value = scenarioCase.expected.values[index];
      if (value !== undefined) {
        assert.strictEqual(predicate(value), expectedValue);
      }
    }
  }

  static 'is-failure-false'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isFailure, false);
  }

  static 'is-failure-true'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isFailure, true);
  }

  static 'is-lifecycle-false'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isLifecycle, false);
  }

  static 'is-lifecycle-true'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isLifecycle, true);
  }

  static 'is-success-false'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isSuccess, false);
  }

  static 'is-success-true'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertPredicate(scenarioCase, LogStatus.isSuccess, true);
  }

  static 'status-categories-failure'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, STATUS_CATEGORIES.FAILURE);
  }

  static 'status-categories-lifecycle'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, STATUS_CATEGORIES.LIFECYCLE);
  }

  static 'status-categories-retry'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, STATUS_CATEGORIES.RETRY);
  }

  static 'status-categories-success'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, STATUS_CATEGORIES.SUCCESS);
  }

  static 'status-failure-values'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, [
      LOG_STATUS.FAILED,
      LOG_STATUS.TIMEOUT,
      LOG_STATUS.INVALID,
      LOG_STATUS.NOT_FOUND,
      LOG_STATUS.UNAUTHORIZED,
      LOG_STATUS.RATE_LIMITED,
      LOG_STATUS.UNAVAILABLE
    ]);
  }

  static 'status-lifecycle-values'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, [
      LOG_STATUS.PENDING,
      LOG_STATUS.IN_PROGRESS,
      LOG_STATUS.COMPLETE
    ]);
  }

  static 'status-retry-values'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, [LOG_STATUS.RETRYING, LOG_STATUS.RETRY_EXHAUSTED]);
  }

  static 'status-success-values'(scenarioCase: LogStatusScenarioCaseEntity.Type): void {
    LogStatusRunners.assertValues(scenarioCase, [
      LOG_STATUS.SUCCESS,
      LOG_STATUS.PARTIAL,
      LOG_STATUS.CACHED,
      LOG_STATUS.SKIPPED
    ]);
  }
}

ScenarioSuite.register({
  'entity': LogStatusScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'LogStatus',
  'runners': LogStatusRunners
});
