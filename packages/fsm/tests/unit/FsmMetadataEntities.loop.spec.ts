import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import {
  InterpreterHistoryRecordMetadataEntity,
  RegisteredInterpreterMetricsEntity
} from '../../src/entities/index.js';
import { FsmMetadataEntitiesScenarioCaseEntity } from './entities/FsmMetadataEntitiesScenarioCaseEntity.js';
import scenarioGroups from './FsmMetadataEntities.scenarios.json' with { 'type': 'json' };

class FsmMetadataEntitiesRunners {
  static 'history-timestamp-validation'(scenarioCase: ScenarioCaseOfType<FsmMetadataEntitiesScenarioCaseEntity.Type, 'history-timestamp-validation'>): void {
    FsmMetadataEntitiesRunners.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  static 'hook-error-count-validation'(scenarioCase: ScenarioCaseOfType<FsmMetadataEntitiesScenarioCaseEntity.Type, 'hook-error-count-validation'>): void {
    FsmMetadataEntitiesRunners.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  private static validateAll(
    validations: FsmMetadataEntitiesScenarioCaseEntity.Type['input']['validations'],
    expectedResults: readonly boolean[]
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      assert.ok(validation !== undefined);
      const result = validation.entity === 'InterpreterHistoryRecordMetadataEntity'
        ? InterpreterHistoryRecordMetadataEntity.validate(validation.value)
        : RegisteredInterpreterMetricsEntity.validate(validation.value);
      assert.equal(result, validation.expected);
      results.push(result);
    }
    assert.deepStrictEqual(results, expectedResults);
  }
}

ScenarioSuite.register({
  'entity': FsmMetadataEntitiesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FSM metadata entities',
  'runners': FsmMetadataEntitiesRunners
});
