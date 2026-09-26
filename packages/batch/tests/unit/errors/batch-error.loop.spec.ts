import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BatchError } from '../../../src/errors/BatchError.js';
import { BatchErrorScenarioCaseEntity } from './entities/BatchErrorScenarioCaseEntity.js';
import scenarioGroups from './batch-error.scenarios.json' with { type: 'json' };

type ScenarioCase = BatchErrorScenarioCaseEntity.Type;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
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
  await runnerMap[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(BatchErrorScenarioCaseEntity.Schema, BatchErrorScenarioCaseEntity.Node);

void describe('BatchError', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
