import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { PatchOperationCoreEntity } from '../../src/entities/PatchOperationCoreEntity.js';
import { PatchOperationCoreEntityScenarioCaseEntity } from './entities/PatchOperationCoreEntityScenarioCaseEntity.js';
import scenarioGroups from './PatchOperationCoreEntity.scenarios.json' with { 'type': 'json' };

class PatchOperationCoreEntityRunners {
  static 'invalid-missing-path'(
    scenarioCase: ScenarioCaseOfType<
      PatchOperationCoreEntityScenarioCaseEntity.Type,
      'invalid-missing-path'
    >
  ): void {
    assert.equal(
      PatchOperationCoreEntity.validate(scenarioCase.input.operation),
      Boolean(scenarioCase.expected.valid)
    );
  }

  static 'invalid-operation-variant'(
    scenarioCase: ScenarioCaseOfType<
      PatchOperationCoreEntityScenarioCaseEntity.Type,
      'invalid-operation-variant'
    >
  ): void {
    assert.equal(
      PatchOperationCoreEntity.validate(scenarioCase.input.operation),
      Boolean(scenarioCase.expected.valid)
    );
  }

  static 'valid-operation'(
    scenarioCase: ScenarioCaseOfType<
      PatchOperationCoreEntityScenarioCaseEntity.Type,
      'valid-operation'
    >
  ): void {
    assert.equal(
      PatchOperationCoreEntity.validate(scenarioCase.input.operation),
      Boolean(scenarioCase.expected.valid)
    );
  }
}

ScenarioSuite.register({
  'entity': PatchOperationCoreEntityScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'PatchOperationCoreEntity',
  'runners': PatchOperationCoreEntityRunners
});
