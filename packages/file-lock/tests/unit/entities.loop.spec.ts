import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockOptionsEntity, FileLockPathStateEntity } from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { FileLockEntitiesScenarioCaseEntity } from './entities/FileLockEntitiesScenarioCaseEntity.js';

class FileLockEntitiesRunners {
  static 'reject-empty-path'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-empty-path'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static 'reject-incomplete-path-state'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-incomplete-path-state'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static 'reject-non-positive-pollMs'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-non-positive-pollMs'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static 'reject-non-positive-timeoutMs'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-non-positive-timeoutMs'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static 'reject-unexpected-property'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-unexpected-property'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static 'valid-entities'(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'valid-entities'>): void {
    FileLockEntitiesRunners.assertValidations(scenarioCase);
  }

  static declaresPathStateCreate(): void {
    void describe('FileLockPathStateEntity.create', () => {
      void it('accepts a plain unbranded literal for minLength-constrained properties and validates', () => {
        const result = FileLockPathStateEntity.create({ 'lockPath': '/tmp/a.lock', 'originalPath': '/tmp/a' });
        assert.deepEqual(result, { 'lockPath': '/tmp/a.lock', 'originalPath': '/tmp/a' });
        assert.equal(FileLockPathStateEntity.validate(result), true);
      });
    });
  }

  private static assertValidations(scenarioCase: ScenarioCaseOfType<FileLockEntitiesScenarioCaseEntity.Type, 'reject-empty-path' | 'reject-incomplete-path-state' | 'reject-non-positive-pollMs' | 'reject-non-positive-timeoutMs' | 'reject-unexpected-property' | 'valid-entities'>): void {
    const results: boolean[] = [];
    const validations = scenarioCase.input.validations;
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      assert.ok(validation !== undefined);
      let result = false;
      if (validation.entity === 'FileLockOptionsEntity') {
        result = FileLockOptionsEntity.validate(validation.value);
      } else if (validation.entity === 'FileLockPathStateEntity') {
        result = FileLockPathStateEntity.validate(validation.value);
      }
      assert.equal(result, validation.expected);
      results.push(result);
    }

    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  }
}

ScenarioSuite.register({
  'entity': FileLockEntitiesScenarioCaseEntity,
  'extraTests': FileLockEntitiesRunners.declaresPathStateCreate,
  'file': scenarioGroups,
  'name': 'file-lock entities',
  'runners': FileLockEntitiesRunners
});
