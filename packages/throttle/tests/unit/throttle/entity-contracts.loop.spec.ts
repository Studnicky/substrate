import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ThrottleAbortedError, ThrottleDrainingError } from '../../../src/index.js';
import { ActiveOperationStateEntity, ThrottleAbortOptionsEntity } from '../../../src/entities/index.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { name: string; description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'abort-options' }
  | { name: string; description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'active-operation-state' }
  | {
      description: string;
      expected: {
        aborted: { code: string; message: string; timeoutMs: number };
        draining: { code: string; message: string };
      };
      input: {
        aborted: { message: string; timeoutMs: number };
        draining: { message: string };
      };
      shape: 'error-constructors';
      name: string;
    };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'abort-options': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    assert.equal(ThrottleAbortOptionsEntity.validate(input.valid), Boolean(expected.valid));
    assert.equal(ThrottleAbortOptionsEntity.validate(input.invalid), Boolean(expected.invalid));
  },
  'active-operation-state': (scenarioCase) => {
    const { expected, input } = scenarioCase;
    assert.equal(ActiveOperationStateEntity.validate(input.valid), Boolean(expected.valid));
    assert.equal(ActiveOperationStateEntity.validate(input.invalid), Boolean(expected.invalid));
  },
  'error-constructors': (scenarioCase) => {
    const aborted = new ThrottleAbortedError(scenarioCase.input.aborted.message, scenarioCase.input.aborted.timeoutMs);
    const draining = new ThrottleDrainingError(scenarioCase.input.draining.message);
    assert.equal(aborted.code, scenarioCase.expected.aborted.code);
    assert.equal(aborted.message, scenarioCase.expected.aborted.message);
    assert.equal(aborted.timeoutMs, scenarioCase.expected.aborted.timeoutMs);
    assert.equal(draining.code, scenarioCase.expected.draining.code);
    assert.equal(draining.message, scenarioCase.expected.draining.message);
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle entity contracts', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
