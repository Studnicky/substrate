import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BoundedDispatcherErrorEventEntity,
  BoundedDispatcherStartEventEntity,
  BoundedDispatcherSuccessEventEntity
} from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ValidationName =
  | 'BoundedDispatcherErrorEventEntity'
  | 'BoundedDispatcherStartEventEntity'
  | 'BoundedDispatcherSuccessEventEntity';

type ValidationCase = { entity: ValidationName; expected: boolean; value: Record<string, unknown> };

type ScenarioCase = {
  description: string;
  expected: { validationResults: boolean[] };
  input: { validations: ValidationCase[] };
  shape: 'entities-reject-invalid' | 'entities-valid-phases';
  name: string;
};

const validatorMap: Record<ValidationName, (value: Record<string, unknown>) => boolean> = {
  'BoundedDispatcherErrorEventEntity': (value) => BoundedDispatcherErrorEventEntity.validate(value),
  'BoundedDispatcherStartEventEntity': (value) => BoundedDispatcherStartEventEntity.validate(value),
  'BoundedDispatcherSuccessEventEntity': (value) => BoundedDispatcherSuccessEventEntity.validate(value)
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

void describe('bounded dispatcher event entities', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }

  void it('intakes event entities without mutating caller input', () => {
    const startInput: Record<string, unknown> = { 'ignored': true, 'phase': 'start' };
    const successInput: Record<string, unknown> = { 'ignored': true, 'phase': 'success' };
    const errorInput: Record<string, unknown> = { 'ignored': true, 'phase': 'error' };

    assert.deepEqual(BoundedDispatcherStartEventEntity.intake(startInput), { 'phase': 'start' });
    assert.deepEqual(BoundedDispatcherSuccessEventEntity.intake(successInput), { 'phase': 'success' });
    assert.deepEqual(BoundedDispatcherErrorEventEntity.intake(errorInput), { 'phase': 'error' });
    assert.deepEqual(startInput, { 'ignored': true, 'phase': 'start' });
    assert.deepEqual(successInput, { 'ignored': true, 'phase': 'success' });
    assert.deepEqual(errorInput, { 'ignored': true, 'phase': 'error' });
  });

  void it('rejects invalid intake and creates complete event entities', () => {
    const inheritedStart = Object.setPrototypeOf({}, { 'phase': 'start' });
    const startWithUndeclaredProperty: BoundedDispatcherStartEventEntity.Type = { 'phase': 'start' };

    Reflect.set(startWithUndeclaredProperty, 'ignored', true);

    assert.throws(() => BoundedDispatcherStartEventEntity.intake({ 'phase': 'success' }));
    assert.throws(() => BoundedDispatcherSuccessEventEntity.intake({ 'phase': 'error' }));
    assert.throws(() => BoundedDispatcherErrorEventEntity.intake({ 'phase': 'start' }));
    assert.throws(() => BoundedDispatcherStartEventEntity.create());
    assert.throws(() => BoundedDispatcherSuccessEventEntity.create());
    assert.throws(() => BoundedDispatcherErrorEventEntity.create());
    assert.throws(() => BoundedDispatcherStartEventEntity.create(startWithUndeclaredProperty));
    assert.deepEqual(startWithUndeclaredProperty, { 'ignored': true, 'phase': 'start' });
    assert.equal(BoundedDispatcherStartEventEntity.validate(inheritedStart), false);
    assert.deepEqual(BoundedDispatcherStartEventEntity.create({ 'phase': 'start' }), { 'phase': 'start' });
    assert.deepEqual(BoundedDispatcherSuccessEventEntity.create({ 'phase': 'success' }), { 'phase': 'success' });
    assert.deepEqual(BoundedDispatcherErrorEventEntity.create({ 'phase': 'error' }), { 'phase': 'error' });
  });
});
