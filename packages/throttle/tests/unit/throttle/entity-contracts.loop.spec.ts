import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ActiveOperationStateEntity,
  ThrottleAbortOptionsEntity,
  ThrottleAbortedError,
  ThrottleDrainingError
} from '../../../src/index.js';
import scenarioGroups from './entity-contracts.scenarios.json';

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

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
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

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle entity contracts', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
