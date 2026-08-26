import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { QueueSizeExceededError } from '../../../src/errors/index.js';
import scenarioGroups from './QueueSizeExceededError.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  expected: {
    code: string;
    key: string;
    maximumQueueSize: number;
    message: string;
  };
  input: {
    key: string;
    maximumQueueSize: number;
  };
  name: string;
};

function runScenario(scenarioCase: ScenarioCase): void {
  const error = new QueueSizeExceededError(scenarioCase.input.key, scenarioCase.input.maximumQueueSize);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.message, scenarioCase.expected.message);
  assert.strictEqual(error.key, scenarioCase.expected.key);
  assert.strictEqual(error.maximumQueueSize, scenarioCase.expected.maximumQueueSize);
}

void describe('QueueSizeExceededError', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runScenario(scenarioCase);
    });
  }
});
