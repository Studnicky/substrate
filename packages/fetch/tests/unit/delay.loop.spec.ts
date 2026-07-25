import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Delay } from '../../src/modules/Delay.js';
import scenarioGroups from './delay.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: { invoked: true; ms: number };
  input: { ms: number };
  shape: 'forwards-to-global-settimeout';
  name: string;
};

const originalSetTimeout = globalThis.setTimeout;

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'forwards-to-global-settimeout': async (scenarioCase) => {
    let receivedMs = -1;

    globalThis.setTimeout = ((callback: TimerHandler, timeout?: number, ...args: unknown[]) => {
      receivedMs = timeout ?? -1;
      return originalSetTimeout(() => {
        if (typeof callback === 'function') {
          callback(...args);
        } else if (typeof callback === 'string') {
          void callback;
        }
      }, 0);
    }) as typeof globalThis.setTimeout;

    try {
      await Delay.for(scenarioCase.input.ms);
      assert.equal(receivedMs, scenarioCase.expected.ms);
      assert.equal(scenarioCase.expected.invoked, true);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('delay utility', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
