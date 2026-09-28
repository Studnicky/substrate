import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';

import { ValidateUrlScenarioCaseEntity } from './entities/ValidateUrlScenarioCaseEntity.js';
import scenarioGroups from './validate-url.scenarios.json' with { type: 'json' };

type ScenarioCase = ValidateUrlScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(ValidateUrlScenarioCaseEntity.Schema, ValidateUrlScenarioCaseEntity.Node);

type ScenarioRunner<Shape extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioCase['shape']]: ScenarioRunner<Shape> };
type InvalidURLScenario = Extract<ScenarioCase, { shape: 'empty' | 'invalid' | 'non-string' }>;

function runInvalidURLScenario(scenarioCase: InvalidURLScenario): void {
  assert.throws(() => {
    Reflect.apply(FetchClient.create, FetchClient, [{ 'baseURL': scenarioCase.input.value }]);
  }, (error: Error) => {
    assert.ok(error.message.length > 0);
    return true;
  });
}

const runnerMap: RunnerMap = {
  'empty': runInvalidURLScenario,
  'invalid': runInvalidURLScenario,
  'non-string': runInvalidURLScenario,
  'valid': (scenarioCase) => {
    assert.doesNotThrow(() => {
      Reflect.apply(FetchClient.create, FetchClient, [{ 'baseURL': scenarioCase.input.value }]);
    });
  }
};

function runCase<Shape extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('validate url schema', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
