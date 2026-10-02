import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MutexKeyTransitionEventEntity, MutexQueueEntryEntity } from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { MutexQueueEntryScenarioCaseEntity } from './entities/MutexQueueEntryScenarioCaseEntity.js';

void describe('mutex key transition event entity', () => {
  void it('validates complete transition events and rejects incomplete or unknown fields', () => {
    const completeTransition: unknown = { 'to': 'locked', 'type': 'transitionTo' };
    const incompleteTransition: unknown = { 'type': 'transitionTo' };
    const invalidToTransition: unknown = { 'to': 'invalid', 'type': 'transitionTo' };
    const extraFieldsTransition: unknown = {
      'ignored': true,
      'to': 'locked',
      'type': 'transitionTo'
    };

    const isCompleteValid = MutexKeyTransitionEventEntity.validate(completeTransition);
    assert.strictEqual(isCompleteValid, true);
    const isIncompleteValid = MutexKeyTransitionEventEntity.validate(incompleteTransition);
    assert.strictEqual(isIncompleteValid, false);
    const isInvalidToValid = MutexKeyTransitionEventEntity.validate(invalidToTransition);
    assert.strictEqual(isInvalidToValid, false);
    const isExtraFieldsValid = MutexKeyTransitionEventEntity.validate(extraFieldsTransition);
    assert.strictEqual(isExtraFieldsValid, false);
  });
});

class MutexQueueEntryRunners {
  static 'non-negative'(
    scenarioCase: ScenarioCaseOfType<MutexQueueEntryScenarioCaseEntity.Type, 'non-negative'>
  ): void {
    MutexQueueEntryRunners.assertValidations(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  static 'negative'(
    scenarioCase: ScenarioCaseOfType<MutexQueueEntryScenarioCaseEntity.Type, 'negative'>
  ): void {
    MutexQueueEntryRunners.assertValidations(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  private static assertValidations(
    validations: MutexQueueEntryScenarioCaseEntity.Type['input']['validations'],
    expectedResults: MutexQueueEntryScenarioCaseEntity.Type['expected']['validationResults']
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      if (validation !== undefined) {
        const candidate: unknown = validation.value;
        const isValid = MutexQueueEntryEntity.validate(candidate);
        assert.strictEqual(isValid, validation.expected);
        results.push(isValid);
      }
    }

    assert.deepStrictEqual(results, expectedResults);
  }
}

ScenarioSuite.register({
  'entity': MutexQueueEntryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'mutex queue entry entity',
  'runners': MutexQueueEntryRunners
});
