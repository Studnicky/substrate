import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBufferStateEntity } from '../../../src/entities/index.js';
import { CircularBufferStateScenarioCaseEntity } from './CircularBufferStateScenarioCaseEntity.js';
import scenarioGroups from './CircularBufferStateEntity.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(CircularBufferStateScenarioCaseEntity.Schema, CircularBufferStateScenarioCaseEntity.Node);

type ScenarioCase = CircularBufferStateScenarioCaseEntity.Type;

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = CircularBufferStateEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('CircularBufferStateEntity', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
