import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ContextError } from '../../../src/errors/ContextError.js';
import { ContextErrorScenarioCaseEntity } from './entities/ContextErrorScenarioCaseEntity.js';
import scenarioGroups from './context-error.scenarios.json' with { type: 'json' };

type ScenarioCase = ContextErrorScenarioCaseEntity.Type;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const fileIntake = ScenarioFileCompiler.compileIntake(ContextErrorScenarioCaseEntity.Schema, ContextErrorScenarioCaseEntity.Node);

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
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
