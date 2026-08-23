import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SchedulerTaskDataEntity } from '../../src/entities/index.js';
import scenarioGroups from './SchedulerTaskDataEntity.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: { valid: boolean }; input: { taskData: { atMs: number; intervalMs: number; variant: 'interval' } }; shape: 'valid-task-data'; name: string }
  | { description: string; expected: { valid: boolean }; input: { taskData: { atMs: number; intervalMs: number; variant: 'interval' } }; shape: 'invalid-interval'; name: string };

function runCase(scenarioCase: ScenarioCase): void {
  assert.equal(SchedulerTaskDataEntity.validate(scenarioCase.input.taskData), scenarioCase.expected.valid);
}

void describe('SchedulerTaskDataEntity', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
