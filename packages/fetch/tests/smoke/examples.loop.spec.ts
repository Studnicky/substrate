import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ExamplesScenarioCaseEntity } from './entities/ExamplesScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

type ScenarioCase = ExamplesScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(ExamplesScenarioCaseEntity.Schema, ExamplesScenarioCaseEntity.Node);

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await assert.doesNotReject(async () => {
    await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
