import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ErrorClassificationGuard } from '../../src/validation/ErrorClassificationGuard.js';
import { IsErrorClassificationScenarioCaseEntity } from './entities/IsErrorClassificationScenarioCaseEntity.js';
import scenarioGroups from './is-error-classification.scenarios.json' with { 'type': 'json' };

class IsErrorClassificationRunners {
  static 'invalid-reason'(scenarioCase: ScenarioCaseOfType<IsErrorClassificationScenarioCaseEntity.Type, 'invalid-reason'>): void {
    assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenarioCase.input), scenarioCase.expected.result);
  }

  static 'non-object'(scenarioCase: ScenarioCaseOfType<IsErrorClassificationScenarioCaseEntity.Type, 'non-object'>): void {
    assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenarioCase.input), scenarioCase.expected.result);
  }

  static 'valid'(scenarioCase: ScenarioCaseOfType<IsErrorClassificationScenarioCaseEntity.Type, 'valid'>): void {
    assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenarioCase.input), scenarioCase.expected.result);
  }

  static 'valid-with-reason'(scenarioCase: ScenarioCaseOfType<IsErrorClassificationScenarioCaseEntity.Type, 'valid-with-reason'>): void {
    assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenarioCase.input), scenarioCase.expected.result);
  }
}

ScenarioSuite.register({
  'entity': IsErrorClassificationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'isErrorClassification',
  'runners': IsErrorClassificationRunners
});
