import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import {
  RequestRetryEventEntity,
  RetryGuardStateEntity,
  SettleTaskEventEntity,
  TaskSettlementStateEntity,
  WorkerErrorEnvelopeEntity,
  WorkerFailureStateEntity,
  WorkerLifecycleStateEntity,
  WorkerLogEnvelopeEntity,
  WorkerPoolConfigEntity,
  WorkerProgressEnvelopeEntity,
  WorkerResultEnvelopeKindEntity,
  WorkerTaskDispositionEntity,
  WorkerTaskIndexEntity
} from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { EntitiesScenarioCaseEntity } from './entities/EntitiesScenarioCaseEntity.js';

class EntityValidationSupport {
  static validate(entity: EntitiesScenarioCaseEntity.Type['input']['validations'][number]['entity'], value: Record<string, unknown>): boolean {
    if (entity === 'WorkerErrorEnvelopeEntity') {
      const result = WorkerErrorEnvelopeEntity.validate(value);
      return result;
    }
    if (entity === 'WorkerLogEnvelopeEntity') {
      const result = WorkerLogEnvelopeEntity.validate(value);
      return result;
    }
    if (entity === 'WorkerPoolConfigEntity') {
      const result = WorkerPoolConfigEntity.validate(value);
      return result;
    }
    if (entity === 'WorkerProgressEnvelopeEntity') {
      const result = WorkerProgressEnvelopeEntity.validate(value);
      return result;
    }
    if (entity === 'WorkerTaskDispositionEntity') {
      const result = WorkerTaskDispositionEntity.validate(value);
      return result;
    }
    const result = WorkerTaskIndexEntity.validate(value);
    return result;
  }

  static assertValidations(scenarioCase: EntitiesScenarioCaseEntity.Type): boolean[] {
    const results = scenarioCase.input.validations.map((validation) => {
      const result = EntityValidationSupport.validate(validation.entity, validation.value);
      assert.equal(result, validation.expected);
      return result;
    });

    assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
    return results;
  }
}

class EntitiesRunners {
  static 'rejects-invalid'(scenarioCase: ScenarioCaseOfType<EntitiesScenarioCaseEntity.Type, 'rejects-invalid'>): void {
    const results = EntityValidationSupport.assertValidations(scenarioCase);
    assert.equal(results.every((value) => {
      const result = value === false;
      return result;
    }), true);
  }

  static 'validates-everything'(scenarioCase: ScenarioCaseOfType<EntitiesScenarioCaseEntity.Type, 'validates-everything'>): void {
    const results = EntityValidationSupport.assertValidations(scenarioCase);
    assert.equal(results.every((value) => {
      const result = value === true;
      return result;
    }), true);
  }

  static declaresExtraTests(): void {
    void it('validates complete state and transition objects', () => {
      assert.equal(WorkerLifecycleStateEntity.validate({ 'variant': 'idle' }), true);
      assert.equal(WorkerLifecycleStateEntity.validate('idle'), false);
      assert.equal(TaskSettlementStateEntity.validate({ 'variant': 'unsettled' }), true);
      assert.equal(TaskSettlementStateEntity.validate({ 'unknown': true, 'variant': 'unsettled' }), false);
      assert.equal(WorkerFailureStateEntity.validate({ 'variant': 'operational' }), true);
      assert.equal(RetryGuardStateEntity.validate({ 'variant': 'notRetried' }), true);
      assert.equal(RequestRetryEventEntity.validate({ 'type': 'requestRetry' }), true);
      assert.equal(SettleTaskEventEntity.validate({ 'type': 'settle' }), true);
      assert.equal(WorkerResultEnvelopeKindEntity.validate('result'), true);
    });
  }
}

ScenarioSuite.register({
  'entity': EntitiesScenarioCaseEntity,
  'extraTests': EntitiesRunners.declaresExtraTests,
  'file': scenarioGroups,
  'name': 'worker-pool entities',
  'runners': EntitiesRunners
});
