import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ThrottleValidator } from '../../../src/throttle/validation/ThrottleValidator.js';
import scenarioGroups from './validation.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { result: boolean }; input: unknown; shape: 'non-object-rejected'; name: string }
  | { description: string; expected: { result: boolean }; input: Record<string, unknown>; shape: 'missing-method-rejected'; name: string }
  | { description: string; expected: { result: boolean }; input: Record<string, unknown>; shape: 'full-interface-accepted'; name: string };

function assertValidationResult(scenarioCase: ScenarioCase): void {
  assert.strictEqual(ThrottleValidator.isThrottle(scenarioCase.input), scenarioCase.expected.result);
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'full-interface-accepted': (scenarioCase) => {
    const throttleLike = {
      abort: () => Promise.resolve(undefined),
      drain: () => Promise.resolve(),
      execute: async () => undefined,
      getStats: () => ({ activeCount: 0 }),
      isComplete: () => true
    };
    assert.strictEqual(ThrottleValidator.isThrottle(throttleLike), scenarioCase.expected.result);
  },
  'missing-method-rejected': assertValidationResult,
  'non-object-rejected': assertValidationResult
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle validation', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
