import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { LruCacheNodeTimingEntity } from '../../../src/entities/index.js';
import { LruCacheNodeTimingEntityScenarioCaseEntity } from './LruCacheNodeTimingEntityScenarioCaseEntity.js';
import scenarioGroups from './LruCacheNodeTimingEntity.scenarios.json' with { type: 'json' };

type ScenarioCase = LruCacheNodeTimingEntityScenarioCaseEntity.Type;
type ScenarioCaseByShape = {
  'invalid-timestamps': Extract<ScenarioCase, { shape: 'invalid-timestamps' }>;
  'valid-timestamps': Extract<ScenarioCase, { shape: 'valid-timestamps' }>;
};
type ScenarioShape = keyof ScenarioCaseByShape;
type ScenarioRunnerMap = Record<ScenarioShape, (scenarioCase: ScenarioCase) => void>;

const fileIntake = ScenarioFileCompiler.compileIntake(LruCacheNodeTimingEntityScenarioCaseEntity.Schema, LruCacheNodeTimingEntityScenarioCaseEntity.Node);

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
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});

void describe('LruCacheNodeTimingEntity.create', () => {
  void it('accepts a plain unbranded literal for minimum-constrained properties and validates', () => {
    const result = LruCacheNodeTimingEntity.create({ expiresAt: 5, staleAt: 5 });
    assert.deepEqual(result, { expiresAt: 5, staleAt: 5 });
    assert.equal(LruCacheNodeTimingEntity.validate(result), true);
  });
});
