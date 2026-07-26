import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  AsyncIterDoneDiscriminantEntity,
  AsyncIterErrorDiscriminantEntity,
  AsyncIterValueDiscriminantEntity,
  ChannelEntryStateEntity,
  ChannelStateEntity,
  DispatchCompletedEventEntity,
  DispatchStartedEventEntity,
  SemaphoreWaiterStateEntity
} from '../../src/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ValidationName =
  | 'AsyncIterDoneDiscriminantEntity'
  | 'AsyncIterErrorDiscriminantEntity'
  | 'AsyncIterValueDiscriminantEntity'
  | 'ChannelEntryStateEntity'
  | 'ChannelStateEntity'
  | 'DispatchCompletedEventEntity'
  | 'DispatchStartedEventEntity'
  | 'SemaphoreWaiterStateEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase = {
  description: string;
  expected: { validationResults: boolean[] };
  input: { validations: ValidationCase[] };
  shape: 'invalid-contracts' | 'valid-contracts';
  name: string;
};

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'AsyncIterDoneDiscriminantEntity': (value) => AsyncIterDoneDiscriminantEntity.validate(value),
  'AsyncIterErrorDiscriminantEntity': (value) => AsyncIterErrorDiscriminantEntity.validate(value),
  'AsyncIterValueDiscriminantEntity': (value) => AsyncIterValueDiscriminantEntity.validate(value),
  'ChannelEntryStateEntity': (value) => ChannelEntryStateEntity.validate(value),
  'ChannelStateEntity': (value) => ChannelStateEntity.validate(value),
  'DispatchCompletedEventEntity': (value) => DispatchCompletedEventEntity.validate(value),
  'DispatchStartedEventEntity': (value) => DispatchStartedEventEntity.validate(value),
  'SemaphoreWaiterStateEntity': (value) => SemaphoreWaiterStateEntity.validate(value)
};

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const validator = validatorMap[validation.entity];
    const result = validator(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('concurrency entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
