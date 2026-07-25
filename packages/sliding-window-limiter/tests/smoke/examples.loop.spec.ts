import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import scenarioGroups from './examples.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: { importsWithoutThrow: true };
  input: { file: string };
  shape: 'imports-example';
  name: string;
};

function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  return assert.doesNotReject(async () => {
    await import(scenarioCase.input.file);
  }, `Example ${scenarioCase.name} threw`);
}

void describe('sliding-window-limiter examples', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
