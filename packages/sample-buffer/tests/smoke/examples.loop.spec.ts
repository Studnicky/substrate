import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ExamplesScenarioCaseEntity } from './entities/ExamplesScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(ExamplesScenarioCaseEntity.Schema, ExamplesScenarioCaseEntity.Node);

async function runCase(scenarioCase: ExamplesScenarioCaseEntity.Type): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  await assert.doesNotReject(async () => {
    await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
