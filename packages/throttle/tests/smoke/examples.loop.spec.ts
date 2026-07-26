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
      shape: 'basicThrottle' | 'boundaryKitComposition' | 'drainThrottle' | 'observedThrottle';
      name: string;
    };

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  const examplePath = resolve(examplesRoot, scenarioCase.input.entrypoint);
  await assert.doesNotReject(async () => {
    await import(examplePath);
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
