import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircularBufferStateEntity } from '../../../src/index.js';
import scenarioGroups from './CircularBufferStateEntity.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { validationResults: boolean[] }; input: { validations: { expected: boolean; value: Record<string, unknown> }[] }; shape: 'invalid-lengths' | 'valid-length'; name: string };

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = CircularBufferStateEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('CircularBufferStateEntity', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
