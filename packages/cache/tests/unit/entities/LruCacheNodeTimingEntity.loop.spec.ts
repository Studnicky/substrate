import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LruCacheNodeTimingEntity } from '../../../src/index.js';
import scenarioGroups from './LruCacheNodeTimingEntity.scenarios.json' with { type: 'json' };

type ScenarioCaseByKind = {
  'invalid-timestamps': { description: string; expected: { valid: boolean; invalidChecks: boolean[] }; input: { timing: { expiresAt?: number; staleAt?: number }[] }; kind: 'invalid-timestamps'; name: string };
  'valid-timestamps': { description: string; expected: { valid: boolean }; input: { timing: { expiresAt: number; staleAt: number } }; kind: 'valid-timestamps'; name: string };
};

type ScenarioKind = keyof ScenarioCaseByKind;
type ScenarioCase = ScenarioCaseByKind[ScenarioKind];
type ScenarioRunnerMap = Record<ScenarioKind, (scenarioCase: ScenarioCase) => void>;

function assertScenarioKind<Kind extends ScenarioKind>(
  scenarioCase: ScenarioCase,
  kind: Kind
): asserts scenarioCase is ScenarioCaseByKind[Kind] {
  assert.strictEqual(scenarioCase.kind, kind, `Invalid runner ${kind} for scenario ${scenarioCase.name}`);
}

const runnerMap = {
  'invalid-timestamps': (scenarioCase) => {
    assertScenarioKind(scenarioCase, 'invalid-timestamps');
    const results = scenarioCase.input.timing.map((timing) => LruCacheNodeTimingEntity.validate(timing));
    assert.deepStrictEqual(results, scenarioCase.expected.invalidChecks);
  },
  'valid-timestamps': (scenarioCase) => {
    assertScenarioKind(scenarioCase, 'valid-timestamps');
    assert.equal(LruCacheNodeTimingEntity.validate(scenarioCase.input.timing), scenarioCase.expected.valid);
  }
} satisfies ScenarioRunnerMap;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('LruCacheNodeTimingEntity', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario as ScenarioCase);
    });
  }
});
