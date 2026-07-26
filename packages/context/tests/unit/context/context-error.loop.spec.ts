import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ContextError } from '../../../src/errors/ContextError.js';
import scenarioGroups from './context-error.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        code: string;
        correlationId?: string;
        message: string;
        retryable: boolean;
      };
      input: {
        error: {
          message: string;
        };
      };
      shape: 'construction';
      name: string;
    };

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'construction': async (scenarioCase) => {
    const error = new ContextError(scenarioCase.input.error.message);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Context errors', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
