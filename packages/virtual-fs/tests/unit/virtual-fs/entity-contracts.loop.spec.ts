import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { MkdirOptionsEntity } from '../../../src/entities/index.js';
import { EntityContractsScenarioCaseEntity } from './entities/EntityContractsScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { 'type': 'json' };

class EntityContractsRunners {
  static 'non-boolean-recursive-values'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'non-boolean-recursive-values'>): void {
    EntityContractsRunners.assertValidations(scenarioCase);
  }

  static 'recursive-directory-options'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'recursive-directory-options'>): void {
    EntityContractsRunners.assertValidations(scenarioCase);
  }

  private static assertValidations(
    scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'non-boolean-recursive-values' | 'recursive-directory-options'>
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < scenarioCase.input.validations.length; index += 1) {
      const validation = scenarioCase.input.validations[index];
      if (validation !== undefined) {
        const result = MkdirOptionsEntity.validate(validation.value);
        assert.equal(result, validation.expected);
        results.push(result);
      }
    }

    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  }
}

ScenarioSuite.register({
  'entity': EntityContractsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'MkdirOptionsEntity',
  'runners': EntityContractsRunners
});
