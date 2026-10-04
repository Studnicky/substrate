import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  AsyncIterDoneDiscriminantEntity,
  AsyncIterErrorDiscriminantEntity,
  AsyncIterValueDiscriminantEntity,
  ChannelEntryStateEntity,
  ChannelStateEntity,
  DispatchCompletedEventEntity,
  DispatchStartedEventEntity,
  SemaphoreWaiterFlagsEntity
} from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { ConcurrencyEntitiesScenarioCaseEntity } from './entities/ConcurrencyEntitiesScenarioCaseEntity.js';

interface EntityValidatorInterface {
  validate(value: unknown): boolean;
}

class EntitiesCaseRunner {
  static readonly validators = new Map<ConcurrencyEntitiesScenarioCaseEntity.Type['input']['validations'][number]['entity'], EntityValidatorInterface>([
    ['AsyncIterDoneDiscriminantEntity', AsyncIterDoneDiscriminantEntity],
    ['AsyncIterErrorDiscriminantEntity', AsyncIterErrorDiscriminantEntity],
    ['AsyncIterValueDiscriminantEntity', AsyncIterValueDiscriminantEntity],
    ['ChannelEntryStateEntity', ChannelEntryStateEntity],
    ['ChannelStateEntity', ChannelStateEntity],
    ['DispatchCompletedEventEntity', DispatchCompletedEventEntity],
    ['DispatchStartedEventEntity', DispatchStartedEventEntity],
    ['SemaphoreWaiterFlagsEntity', SemaphoreWaiterFlagsEntity]
  ]);

  static 'invalid-contracts'(scenarioCase: ScenarioCaseOfType<ConcurrencyEntitiesScenarioCaseEntity.Type, 'invalid-contracts'>): void {
    EntitiesCaseRunner.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  static 'valid-contracts'(scenarioCase: ScenarioCaseOfType<ConcurrencyEntitiesScenarioCaseEntity.Type, 'valid-contracts'>): void {
    EntitiesCaseRunner.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  private static validateAll(
    validations: ConcurrencyEntitiesScenarioCaseEntity.Type['input']['validations'],
    expectedResults: readonly boolean[]
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      if (validation === undefined) {
        throw RuntimeError.create('Validation entry is undefined');
      }
      const validator = EntitiesCaseRunner.validators.get(validation.entity);
      if (validator === undefined) {
        throw RuntimeError.create(`No validator found for ${validation.entity}`);
      }
      const result = validator.validate(validation.value);
      assert.equal(result, validation.expected);
      results.push(result);
    }
    assert.deepStrictEqual(results, expectedResults);
  }
}

ScenarioSuite.register({
  'entity': ConcurrencyEntitiesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'concurrency entities',
  'runners': EntitiesCaseRunner
});
