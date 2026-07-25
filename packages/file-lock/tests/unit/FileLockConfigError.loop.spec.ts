import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FileLockConfigError } from '../../src/errors/FileLockConfigError.js';
import scenarioGroups from './FileLockConfigError.scenarios.json';

type ScenarioKind = 'constructs-with-code';

type ScenarioCase = {
  description: string;
  expected: { code: string; message: string };
  input: { message: string };
  kind: ScenarioKind;
  name: string;
};

const runnerMap: Record<ScenarioKind, (scenarioCase: ScenarioCase) => void> = {
  'constructs-with-code': (scenarioCase) => {
    const error = new FileLockConfigError(scenarioCase.input.message);

    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('FileLockConfigError', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
