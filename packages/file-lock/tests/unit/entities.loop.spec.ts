import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockOptionsEntity, FileLockPathStateEntity } from '../../src/entities/index.js';
import { FileLockEntitiesScenarioCaseEntity } from './entities/FileLockEntitiesScenarioCaseEntity.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ScenarioCase = FileLockEntitiesScenarioCaseEntity.Type;
type ValidationCase = ScenarioCase['input']['validations'][number];
type ValidationName = ValidationCase['entity'];

const fileIntake = ScenarioFileCompiler.compileIntake(FileLockEntitiesScenarioCaseEntity.Schema, FileLockEntitiesScenarioCaseEntity.Node);

const validatorMap: Record<ValidationName, (value: unknown) => boolean> = {
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
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
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
