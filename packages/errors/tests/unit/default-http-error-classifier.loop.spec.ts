import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DefaultHttpErrorClassifier } from '../../src/classifiers/DefaultHttpErrorClassifier.js';
import { ErrorWithStatusEntity } from '../../src/entities/ErrorWithStatusEntity.js';
import { DefaultHttpErrorClassifierScenarioCaseEntity } from './entities/DefaultHttpErrorClassifierScenarioCaseEntity.js';
import scenarioGroups from './default-http-error-classifier.scenarios.json' with { type: 'json' };

type ScenarioCase = DefaultHttpErrorClassifierScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(DefaultHttpErrorClassifierScenarioCaseEntity.Schema, DefaultHttpErrorClassifierScenarioCaseEntity.Node);

function createError(input: ScenarioCase['input']): Error {
  const error = RuntimeError.create(input.message ?? '');
  for (const [key, value] of Object.entries(input)) {
    Reflect.set(error, key, value);
  }
  return error;
}

function runCase(scenario: ScenarioCase): void {
  const classifier = DefaultHttpErrorClassifier.create();
  const error = createError(scenario.input);
  const classification = classifier.classify(error, scenario.attemptNumber);

  assert.deepStrictEqual(classification, scenario.expected);
  assert.strictEqual(ErrorWithStatusEntity.validate(error), 'status' in scenario.input ? true : false);
}

void describe('DefaultHttpErrorClassifier', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
