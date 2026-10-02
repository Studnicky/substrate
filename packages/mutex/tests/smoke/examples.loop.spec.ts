import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ExamplesSmokeScenarioCaseEntity } from './entities/ExamplesSmokeScenarioCaseEntity.js';
import scenarioGroups from './examples.scenarios.json' with { 'type': 'json' };

let currentDir: string;
try {
  currentDir = fileURLToPath(new URL('.', import.meta.url));
} catch (error) {
  throw RuntimeError.create('Failed to resolve current directory', { 'cause': error });
}

const examplesRoot = resolve(currentDir, '../../examples');

class ExamplesSmokeRunners {
  static async 'smoke'(
    scenarioCase: ScenarioCaseOfType<ExamplesSmokeScenarioCaseEntity.Type, 'smoke'>
  ): Promise<void> {
    assert.equal(scenarioCase.expected.importsWithoutThrow, true);
    await assert.doesNotReject(async () => {
      await import(resolve(examplesRoot, scenarioCase.input.entrypoint));
    }, `Example ${scenarioCase.input.entrypoint} threw`);
  }
}

ScenarioSuite.register({
  'entity': ExamplesSmokeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'examples smoke',
  'runners': ExamplesSmokeRunners
});
