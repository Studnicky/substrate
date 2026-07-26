import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const examplesRoot = resolve(currentDir, '../../examples');

type ScenarioCase =
  | {
      description: string;
      expected: { importsWithoutThrow: true };
      input: { entrypoint: string };
      name: string;
    };

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  await assert.doesNotReject(async () => {
    await import(resolve(examplesRoot, scenarioCase.input.entrypoint));
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario as ScenarioCase);
    });
  }
});
