import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import scenarioGroups from './examples.scenarios.json';

type ScenarioCase = {
  readonly description: string;
  readonly expected: { readonly importsWithoutThrow: true };
  readonly input: { readonly entrypoint: string };
  readonly name: string;
};

const typedScenarioGroups: { readonly cases: readonly ScenarioCase[] } = scenarioGroups;

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  assert.equal(scenarioCase.expected.importsWithoutThrow, true);
  await assert.doesNotReject(async () => {
    await import(new URL(scenarioCase.input.entrypoint, import.meta.url).href);
  }, `Example ${scenarioCase.input.entrypoint} threw`);
}

void describe('examples smoke', () => {
  for (const scenario of typedScenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
