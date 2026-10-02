import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ExampleSmokeScenarioCaseEntity } from './entities/ExampleSmokeScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

class ExampleSmokeRunners {
  static async 'imports-example'(scenarioCase: ScenarioCaseOfType<ExampleSmokeScenarioCaseEntity.Type, 'imports-example'>): Promise<void> {
    assert.equal(scenarioCase.expected.importsWithoutThrow, true);
    await assert.doesNotReject(async () => {
      await import(import.meta.resolve(scenarioCase.input.entrypoint));
    }, `Example ${scenarioCase.input.entrypoint} threw`);
  }
}

ScenarioSuite.register({
  'entity': ExampleSmokeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'examples smoke',
  'runners': ExampleSmokeRunners
});
