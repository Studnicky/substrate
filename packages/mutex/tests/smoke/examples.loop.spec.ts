import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { ExamplesSmokeScenarioCaseEntity } from './entities/ExamplesSmokeScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const examplesRoot = resolve(currentDir, '../../examples');

type ScenarioCase = ExamplesSmokeScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(ExamplesSmokeScenarioCaseEntity.Schema, ExamplesSmokeScenarioCaseEntity.Node);

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  await assert.doesNotReject(async () => {
    await import(resolve(examplesRoot, scenarioCase.input.entrypoint));
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
