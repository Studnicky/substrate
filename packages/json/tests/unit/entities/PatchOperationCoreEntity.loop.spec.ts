import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PatchOperationCoreEntity } from '../../../src/entities/PatchOperationCoreEntity.js';
import { PatchOperationCoreEntityScenarioCaseEntity } from './PatchOperationCoreEntityScenarioCaseEntity.js';
import scenarioGroups from './PatchOperationCoreEntity.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(PatchOperationCoreEntityScenarioCaseEntity.Schema, PatchOperationCoreEntityScenarioCaseEntity.Node);

function runCase(scenarioCase: PatchOperationCoreEntityScenarioCaseEntity.Type): void {
  assert.equal(PatchOperationCoreEntity.validate(scenarioCase.input.operation), scenarioCase.expected.valid);
}

void describe('PatchOperationCoreEntity', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
