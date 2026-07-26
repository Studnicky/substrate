import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WorkerErrorEnvelopeEntity,
  WorkerLogEnvelopeEntity,
  WorkerPoolConfigEntity,
  WorkerProgressEnvelopeEntity,
  WorkerResultEnvelopeDiscriminantEntity,
  WorkerTaskDispositionEntity,
  WorkerTaskIndexEntity
} from '../../src/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ValidationName =
  | 'WorkerErrorEnvelopeEntity'
  | 'WorkerLogEnvelopeEntity'
  | 'WorkerPoolConfigEntity'
  | 'WorkerProgressEnvelopeEntity'
  | 'WorkerResultEnvelopeDiscriminantEntity'
  | 'WorkerTaskDispositionEntity'
  | 'WorkerTaskIndexEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase =
  | { description: string; expected: { validationResults: boolean[] }; input: { validations: ValidationCase[] }; shape: 'rejects-invalid' | 'validates-everything'; name: string };

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'WorkerErrorEnvelopeEntity': (value) => WorkerErrorEnvelopeEntity.validate(value),
  'WorkerLogEnvelopeEntity': (value) => WorkerLogEnvelopeEntity.validate(value),
  'WorkerPoolConfigEntity': (value) => WorkerPoolConfigEntity.validate(value),
  'WorkerProgressEnvelopeEntity': (value) => WorkerProgressEnvelopeEntity.validate(value),
  'WorkerResultEnvelopeDiscriminantEntity': (value) => WorkerResultEnvelopeDiscriminantEntity.validate(value),
  'WorkerTaskDispositionEntity': (value) => WorkerTaskDispositionEntity.validate(value),
  'WorkerTaskIndexEntity': (value) => WorkerTaskIndexEntity.validate(value)
};

function assertEntityValidations(scenarioCase: ScenarioCase): boolean[] {
  const results = scenarioCase.input.validations.map((validation) => {
    const validator = validatorMap[validation.entity];
    const result = validator(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
  return results;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'rejects-invalid': (scenarioCase) => {
    const results = assertEntityValidations(scenarioCase);
    assert.equal(results.every((value) => value === false), true);
  },
  'validates-everything': (scenarioCase) => {
    const results = assertEntityValidations(scenarioCase);
    assert.equal(results.every((value) => value === true), true);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('worker-pool entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
