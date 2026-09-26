import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { MkdirOptionsEntity } from '../../../src/entities/index.js';
import { EntityContractsScenarioCaseEntity } from './entities/EntityContractsScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { type: 'json' };

function runCase(scenarioCase: EntityContractsScenarioCaseEntity.Type): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = MkdirOptionsEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

const fileIntake = ScenarioFileCompiler.compileIntake(EntityContractsScenarioCaseEntity.Schema, EntityContractsScenarioCaseEntity.Node);

void describe('MkdirOptionsEntity', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
