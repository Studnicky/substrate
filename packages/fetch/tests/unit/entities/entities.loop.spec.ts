import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ClientConfigDataEntity, FetchRequestOptionsEntity } from '../../../src/index.js';
import scenarioGroups from './entities.scenarios.json';

type ValidationName = 'ClientConfigDataEntity' | 'FetchRequestOptionsEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: ValidationCase[] };
      shape: 'client-config-invalid' | 'client-config-valid' | 'request-options-invalid' | 'request-options-valid';
      name: string;
    };

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'ClientConfigDataEntity': (value) => ClientConfigDataEntity.validate(value),
  'FetchRequestOptionsEntity': (value) => FetchRequestOptionsEntity.validate(value)
};

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = validatorMap[validation.entity](validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('fetch data entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
