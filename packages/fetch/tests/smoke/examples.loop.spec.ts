import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import scenarioGroups from './examples.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  input: { entrypoint: string };
  name: string;
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await assert.doesNotReject(async () => {
    await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
