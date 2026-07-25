import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BatchError } from '../../../src/errors/BatchError.js';
import scenarioGroups from './batch-error.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: {
        code: string;
        correlationId?: string;
        metadata?: Record<string, unknown>;
        message: string;
        retryable: boolean;
      };
      input: {
        error: {
          args?: {
            cause?: unknown;
            correlationId?: string;
            metadata?: Record<string, unknown>;
          };
          message: string;
        };
      };
      kind: 'construction';
      name: string;
    };

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['kind'], ScenarioRunner> = {
  'construction': async (scenarioCase) => {
    const error = new BatchError(scenarioCase.input.error.message, scenarioCase.input.error.args);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.message, scenarioCase.expected.message);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.correlationId, scenarioCase.expected.correlationId);
    assert.deepStrictEqual(error.metadata, scenarioCase.expected.metadata);
    if (scenarioCase.input.error.args?.cause !== undefined) {
      assert.strictEqual(error.cause, scenarioCase.input.error.args.cause);
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('BatchError', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
