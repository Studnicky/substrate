import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockOptionsEntity, FileLockPathStateEntity } from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ValidationName = 'FileLockOptionsEntity' | 'FileLockPathStateEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: ValidationCase[] };
      shape:
        | 'reject-empty-path'
        | 'reject-incomplete-path-state'
        | 'reject-non-positive-pollMs'
        | 'reject-non-positive-timeoutMs'
        | 'reject-unexpected-property'
        | 'valid-entities';
      name: string;
    };

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

void describe('FileLockPathStateEntity.create', () => {
  void it('accepts a plain unbranded literal for minLength-constrained properties and validates', () => {
    const result = FileLockPathStateEntity.create({ lockPath: '/tmp/a.lock', originalPath: '/tmp/a' });
    assert.deepEqual(result, { lockPath: '/tmp/a.lock', originalPath: '/tmp/a' });
    assert.equal(FileLockPathStateEntity.validate(result), true);
  });
});
