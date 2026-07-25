import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BoundedDispatcherErrorEventEntity,
  BoundedDispatcherStartEventEntity,
  BoundedDispatcherSuccessEventEntity
} from '../../src/index.js';
import scenarioGroups from './entities.scenarios.json';

type ValidationName =
  | 'BoundedDispatcherErrorEventEntity'
  | 'BoundedDispatcherStartEventEntity'
  | 'BoundedDispatcherSuccessEventEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase = {
  description: string;
  expected: { validationResults: boolean[] };
  input: { validations: ValidationCase[] };
  shape: 'entities-reject-invalid' | 'entities-valid-phases';
  name: string;
};

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'BoundedDispatcherErrorEventEntity': (value) => BoundedDispatcherErrorEventEntity.validate(value),
  'BoundedDispatcherStartEventEntity': (value) => BoundedDispatcherStartEventEntity.validate(value),
  'BoundedDispatcherSuccessEventEntity': (value) => BoundedDispatcherSuccessEventEntity.validate(value)
};

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const validator = validatorMap[validation.entity];
    const result = validator(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('bounded dispatcher event entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
