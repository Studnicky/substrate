import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { CircularBufferStateEntity } from '../../src/entities/index.js';
import scenarioGroups from './entities/CircularBufferStateEntity.scenarios.json' with { 'type': 'json' };
import { CircularBufferStateScenarioCaseEntity } from './entities/CircularBufferStateScenarioCaseEntity.js';

class CircularBufferStateEntityRunners {
  static 'invalid-lengths'(scenarioCase: ScenarioCaseOfType<CircularBufferStateScenarioCaseEntity.Type, 'invalid-lengths'>): void {
    CircularBufferStateEntityRunners.assertValidations(scenarioCase);
  }

  static 'valid-length'(scenarioCase: ScenarioCaseOfType<CircularBufferStateScenarioCaseEntity.Type, 'valid-length'>): void {
    CircularBufferStateEntityRunners.assertValidations(scenarioCase);
  }

  static assertValidations(scenarioCase: CircularBufferStateScenarioCaseEntity.Type): void {
    const validations = scenarioCase.input.validations;
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index]!;
      const result = CircularBufferStateEntity.validate(validation.value);
      assert.equal(result, validation.expected);
      results.push(result);
    }
    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  }
}

ScenarioSuite.register({
  'entity': CircularBufferStateScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircularBufferStateEntity',
  'runners': CircularBufferStateEntityRunners
});
