import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LruCacheNodeTimingEntity } from '../../../src/index.js';
import scenarioGroups from './LruCacheNodeTimingEntity.scenarios.json' with { type: 'json' };

type ScenarioCaseByShape = {
  'invalid-timestamps': { description: string; expected: { valid: boolean; invalidChecks: boolean[] }; input: { timing: { expiresAt?: number; staleAt?: number }[] }; shape: 'invalid-timestamps'; name: string };
  'valid-timestamps': { description: string; expected: { valid: boolean }; input: { timing: { expiresAt: number; staleAt: number } }; shape: 'valid-timestamps'; name: string };
};

type ScenarioShape = keyof ScenarioCaseByShape;
type ScenarioCase = ScenarioCaseByShape[ScenarioShape];
type ScenarioRunnerMap = Record<ScenarioShape, (scenarioCase: ScenarioCase) => void>;

function assertScenarioShape<Shape extends ScenarioShape>(
  scenarioCase: ScenarioCase,
  shape: Shape
): asserts scenarioCase is ScenarioCaseByShape[Shape] {
  assert.strictEqual(scenarioCase.shape, shape, `Invalid runner ${shape} for scenario ${scenarioCase.name}`);
}

const runnerMap = {
  'invalid-timestamps': (scenarioCase) => {
    assertScenarioShape(scenarioCase, 'invalid-timestamps');
    const results = scenarioCase.input.timing.map((timing) => LruCacheNodeTimingEntity.validate(timing));
    assert.deepStrictEqual(results, scenarioCase.expected.invalidChecks);
  },
  'valid-timestamps': (scenarioCase) => {
    assertScenarioShape(scenarioCase, 'valid-timestamps');
    assert.equal(LruCacheNodeTimingEntity.validate(scenarioCase.input.timing), scenarioCase.expected.valid);
  }
} satisfies ScenarioRunnerMap;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('LruCacheNodeTimingEntity', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario as ScenarioCase);
    });
  }
});
