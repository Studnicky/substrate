import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BoundedDispatcherErrorEventEntity,
  BoundedDispatcherStartEventEntity,
  BoundedDispatcherSuccessEventEntity
} from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { 'type': 'json' };
import { EventEntitiesScenarioCaseEntity } from './entities/EventEntitiesScenarioCaseEntity.js';

interface EventEntityValidatorInterface {
  validate(value: unknown): boolean;
}

class EventEntitiesCaseRunner {
  static readonly validators = new Map<EventEntitiesScenarioCaseEntity.Type['input']['validations'][number]['entity'], EventEntityValidatorInterface>([
    ['BoundedDispatcherErrorEventEntity', BoundedDispatcherErrorEventEntity],
    ['BoundedDispatcherStartEventEntity', BoundedDispatcherStartEventEntity],
    ['BoundedDispatcherSuccessEventEntity', BoundedDispatcherSuccessEventEntity]
  ]);

  static 'entities-reject-invalid'(
    scenarioCase: EventEntitiesScenarioCaseEntity.Type
  ): void {
    EventEntitiesCaseRunner.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  static 'entities-valid-phases'(
    scenarioCase: EventEntitiesScenarioCaseEntity.Type
  ): void {
    EventEntitiesCaseRunner.validateAll(scenarioCase.input.validations, scenarioCase.expected.validationResults);
  }

  private static validateAll(
    validations: EventEntitiesScenarioCaseEntity.Type['input']['validations'],
    expectedResults: readonly boolean[]
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < validations.length; index += 1) {
      const validation = validations[index];
      if (validation === undefined) {
        throw RuntimeError.create('Validation entry is undefined');
      }
      const validator = EventEntitiesCaseRunner.validators.get(validation.entity);
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

void describe('bounded dispatcher event entities', () => {
  void it('rejects undeclared event properties without mutating caller input', () => {
    const startInput: Record<string, unknown> = { 'ignored': true, 'phase': 'start' };
    const successInput: Record<string, unknown> = { 'ignored': true, 'phase': 'success' };
    const errorInput: Record<string, unknown> = { 'ignored': true, 'phase': 'error' };

    assert.throws(() => {
      const result = BoundedDispatcherStartEventEntity.intake(startInput);
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherSuccessEventEntity.intake(successInput);
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherErrorEventEntity.intake(errorInput);
      return result;
    });
    assert.deepEqual(startInput, { 'ignored': true, 'phase': 'start' });
    assert.deepEqual(successInput, { 'ignored': true, 'phase': 'success' });
    assert.deepEqual(errorInput, { 'ignored': true, 'phase': 'error' });
  });

  void it('rejects invalid intake and creates complete event entities', () => {
    const inheritedStart: unknown = Object.setPrototypeOf({}, { 'phase': 'start' });
    const startWithUndeclaredProperty: BoundedDispatcherStartEventEntity.Type = BoundedDispatcherStartEventEntity.create({ 'phase': 'start' });

    Reflect.set(startWithUndeclaredProperty, 'ignored', true);

    assert.throws(() => {
      const result = BoundedDispatcherStartEventEntity.intake({ 'phase': 'success' });
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherSuccessEventEntity.intake({ 'phase': 'error' });
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherErrorEventEntity.intake({ 'phase': 'start' });
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherStartEventEntity.create();
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherSuccessEventEntity.create();
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherErrorEventEntity.create();
      return result;
    });
    assert.throws(() => {
      const result = BoundedDispatcherStartEventEntity.create(startWithUndeclaredProperty);
      return result;
    });
    assert.deepEqual(startWithUndeclaredProperty, { 'ignored': true, 'phase': 'start' });
    assert.equal(BoundedDispatcherStartEventEntity.validate(inheritedStart), false);
    assert.deepEqual(BoundedDispatcherStartEventEntity.create({ 'phase': 'start' }), { 'phase': 'start' });
    assert.deepEqual(BoundedDispatcherSuccessEventEntity.create({ 'phase': 'success' }), { 'phase': 'success' });
    assert.deepEqual(BoundedDispatcherErrorEventEntity.create({ 'phase': 'error' }), { 'phase': 'error' });
  });
});

ScenarioSuite.register({
  'entity': EventEntitiesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'bounded dispatcher event entities',
  'runners': EventEntitiesCaseRunner
});
