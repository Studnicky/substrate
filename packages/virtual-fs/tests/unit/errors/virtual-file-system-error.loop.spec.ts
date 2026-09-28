import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualFileSystemError } from '../../../src/errors/VirtualFileSystemError.js';
import { VirtualFileSystemErrorScenarioCaseEntity } from './entities/VirtualFileSystemErrorScenarioCaseEntity.js';
import scenarioGroups from './virtual-file-system-error.scenarios.json' with { type: 'json' };

type ScenarioCase = VirtualFileSystemErrorScenarioCaseEntity.Type;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'construction': async (scenarioCase) => {
    const error = new VirtualFileSystemError(scenarioCase.input.error.message, scenarioCase.input.error.args);
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

const fileIntake = ScenarioFileCompiler.compileIntake(VirtualFileSystemErrorScenarioCaseEntity.Schema, VirtualFileSystemErrorScenarioCaseEntity.Node);

void describe('VirtualFileSystemError', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
