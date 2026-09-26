import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  InterpreterHistoryRecordMetadataEntity,
  RegisteredInterpreterMetricsEntity
} from '../../src/entities/index.js';
import { FsmMetadataEntitiesScenarioCaseEntity } from './entities/FsmMetadataEntitiesScenarioCaseEntity.js';
import scenarioGroups from './FsmMetadataEntities.scenarios.json' with { type: 'json' };

const validatorMap = {
  'InterpreterHistoryRecordMetadataEntity': (value: unknown) => InterpreterHistoryRecordMetadataEntity.validate(value),
  'RegisteredInterpreterMetricsEntity': (value: unknown) => RegisteredInterpreterMetricsEntity.validate(value)
} as const;

type ScenarioCase = FsmMetadataEntitiesScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(FsmMetadataEntitiesScenarioCaseEntity.Schema, FsmMetadataEntitiesScenarioCaseEntity.Node);

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = validatorMap[validation.entity](validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('FSM metadata entities', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
