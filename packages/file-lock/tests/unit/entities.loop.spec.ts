import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockOptionsEntity, FileLockPathStateEntity } from '../../src/index.js';
import scenarioGroups from './entities.scenarios.json';

type ValidationName = 'FileLockOptionsEntity' | 'FileLockPathStateEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase =
  | { description: string; expected: { validationResults: boolean[] }; input: { validations: ValidationCase[] }; shape: 'reject-incomplete-path-state' | 'valid-entities'; name: string };

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'FileLockOptionsEntity': (value) => FileLockOptionsEntity.validate(value),
  'FileLockPathStateEntity': (value) => FileLockPathStateEntity.validate(value)
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

void describe('file-lock entities', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
