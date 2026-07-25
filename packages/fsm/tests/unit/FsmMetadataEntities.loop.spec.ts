import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  InterpreterHistoryRecordMetadataEntity,
  RegisteredInterpreterMetricsEntity
} from '../../src/index.js';
import scenarioGroups from './FsmMetadataEntities.scenarios.json';

const validatorMap = {
  'InterpreterHistoryRecordMetadataEntity': (value: Record<string, unknown>) => InterpreterHistoryRecordMetadataEntity.validate(value),
  'RegisteredInterpreterMetricsEntity': (value: Record<string, unknown>) => RegisteredInterpreterMetricsEntity.validate(value)
} as const;

type ValidationName = keyof typeof validatorMap;

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: { entity: ValidationName; expected: boolean; value: Record<string, unknown> }[] };
      kind: 'history-timestamp-validation' | 'hook-error-count-validation';
      name: string;
    };

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = validatorMap[validation.entity](validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('FSM metadata entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
