import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SchedulerTaskDataEntity } from '../../src/entities/index.js';
import { SchedulerTaskDataScenarioCaseEntity } from './entities/SchedulerTaskDataScenarioCaseEntity.js';
import scenarioGroups from './SchedulerTaskDataEntity.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(SchedulerTaskDataScenarioCaseEntity.Schema, SchedulerTaskDataScenarioCaseEntity.Node);

function runCase(scenarioCase: SchedulerTaskDataScenarioCaseEntity.Type): void {
  assert.equal(SchedulerTaskDataEntity.validate(scenarioCase.input.taskData), scenarioCase.expected.valid);
}

void describe('SchedulerTaskDataEntity', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
