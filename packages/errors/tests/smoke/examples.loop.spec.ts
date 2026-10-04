import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { RuntimeError } from '../../src/index.js';
import { ExamplesSmokeScenarioCaseEntity } from './entities/ExamplesSmokeScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

class ExamplesSmokeRunners {
  static async smoke(
    scenarioCase: ScenarioCaseOfType<ExamplesSmokeScenarioCaseEntity.Type, 'smoke'>
  ): Promise<void> {
    await assert.doesNotReject(async () => {
      await import(ExamplesSmokeRunners.resolveEntrypoint(scenarioCase.input.entrypoint));
    }, `Example ${scenarioCase.input.entrypoint} threw`);
  }

  private static resolveEntrypoint(entrypoint: string): string {
    try {
      const href = new URL(entrypoint, import.meta.url).href;
      return href;
    } catch (error) {
      throw RuntimeError.create(`Example entrypoint ${entrypoint} is not a resolvable URL`, {
        'cause': error
      });
    }
  }
}

ScenarioSuite.register({
  'entity': ExamplesSmokeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'examples smoke',
  'runners': ExamplesSmokeRunners
});
