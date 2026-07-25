import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import scenarioGroups from './examples.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: { importsWithoutThrow: true };
  input: { entrypoint: string };
  kind: string;
  name: string;
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  await assert.doesNotReject(async () => {
    await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
  }, `Example ${scenarioCase.kind} threw`);
}

void describe('JSON smoke', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
