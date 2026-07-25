import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const examplesRoot = fileURLToPath(new URL('../../examples/', import.meta.url));

import scenarioGroups from './examples.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: { importsWithoutThrow: true };
  input: { fileName: string };
  shape: 'example-file';
  name: string;
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  const examplePath = resolve(examplesRoot, scenarioCase.input.fileName);
  await assert.doesNotReject(async () => {
    return await import(examplePath);
  }, `Example ${scenarioCase.input.fileName} threw`);
}

void describe('examples smoke', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
