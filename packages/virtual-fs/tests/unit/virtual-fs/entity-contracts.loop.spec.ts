import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { MkdirOptionsEntity } from '../../../src/entities/index.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: { expected: boolean; value: Record<string, unknown> }[] };
      shape: 'non-boolean-recursive-values' | 'recursive-directory-options';
      name: string;
    };

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = MkdirOptionsEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

const scenarios = scenarioGroups.cases as ScenarioCase[];

void describe('MkdirOptionsEntity', () => {
  for (const scenario of scenarios) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
