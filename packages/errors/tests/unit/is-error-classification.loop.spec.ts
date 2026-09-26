import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassificationGuard } from '../../src/validation/ErrorClassificationGuard.js';
import { IsErrorClassificationScenarioCaseEntity } from './entities/IsErrorClassificationScenarioCaseEntity.js';
import scenarioGroups from './is-error-classification.scenarios.json' with { type: 'json' };

type ScenarioCase = IsErrorClassificationScenarioCaseEntity.Type;
type ScenarioRunner = (scenario: ScenarioCase) => void;

const fileIntake = ScenarioFileCompiler.compileIntake(IsErrorClassificationScenarioCaseEntity.Schema, IsErrorClassificationScenarioCaseEntity.Node);

const runClassification: ScenarioRunner = (scenario) => {
  assert.strictEqual(ErrorClassificationGuard.isErrorClassification(scenario.input), scenario.expected.result);
};

const runnerMap = {
  'invalid-reason': runClassification,
  'non-object': runClassification,
  'valid': runClassification,
  'valid-with-reason': runClassification
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.shape](scenario);
}

void describe('isErrorClassification', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
