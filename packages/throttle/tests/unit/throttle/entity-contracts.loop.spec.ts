import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ActiveOperationStateEntity, ThrottleAbortOptionsEntity } from '../../../src/entities/index.js';
import { ThrottleAbortedError, ThrottleDrainingError } from '../../../src/index.js';
import { EntityContractsScenarioCaseEntity } from './entities/EntityContractsScenarioCaseEntity.js';
import scenarioGroups from './entity-contracts.scenarios.json' with { 'type': 'json' };

class EntityContractsRunners {
  static 'abort-options'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'abort-options'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(ThrottleAbortOptionsEntity.validate(input.valid), Boolean(expected.valid));
    assert.equal(ThrottleAbortOptionsEntity.validate(input.invalid), Boolean(expected.invalid));
  }

  static 'active-operation-state'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'active-operation-state'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(ActiveOperationStateEntity.validate(input.valid), Boolean(expected.valid));
    assert.equal(ActiveOperationStateEntity.validate(input.invalid), Boolean(expected.invalid));
  }

  static 'error-constructors'(scenarioCase: ScenarioCaseOfType<EntityContractsScenarioCaseEntity.Type, 'error-constructors'>): void {
    const aborted = new ThrottleAbortedError(scenarioCase.input.aborted.message, scenarioCase.input.aborted.timeoutMs);
    const draining = new ThrottleDrainingError(scenarioCase.input.draining.message);
    assert.equal(aborted.code, scenarioCase.expected.aborted.code);
    assert.equal(aborted.message, scenarioCase.expected.aborted.message);
    assert.equal(aborted.timeoutMs, scenarioCase.expected.aborted.timeoutMs);
    assert.equal(draining.code, scenarioCase.expected.draining.code);
    assert.equal(draining.message, scenarioCase.expected.draining.message);
  }
}

ScenarioSuite.register({
  'entity': EntityContractsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle entity contracts',
  'runners': EntityContractsRunners
});
