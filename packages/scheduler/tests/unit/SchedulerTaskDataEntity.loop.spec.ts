import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { SchedulerTaskDataEntity } from '../../src/entities/index.js';
import { SchedulerTaskDataScenarioCaseEntity } from './entities/SchedulerTaskDataScenarioCaseEntity.js';
import scenarioGroups from './SchedulerTaskDataEntity.scenarios.json' with { 'type': 'json' };

class SchedulerTaskDataRunners {
  static 'invalid-interval'(scenarioCase: ScenarioCaseOfType<SchedulerTaskDataScenarioCaseEntity.Type, 'invalid-interval'>): void {
    assert.equal(SchedulerTaskDataEntity.validate(scenarioCase.input.taskData), scenarioCase.expected.valid);
  }

  static 'valid-task-data'(scenarioCase: ScenarioCaseOfType<SchedulerTaskDataScenarioCaseEntity.Type, 'valid-task-data'>): void {
    assert.equal(SchedulerTaskDataEntity.validate(scenarioCase.input.taskData), scenarioCase.expected.valid);
  }
}

ScenarioSuite.register({
  'entity': SchedulerTaskDataScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'SchedulerTaskDataEntity',
  'runners': SchedulerTaskDataRunners
});
