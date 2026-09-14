import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MutexKeyTransitionEventEntity, MutexQueueEntryEntity } from '../../src/entities/index.js';
import scenarioGroups from './entities.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { validationResults: boolean[] };
      input: { validations: { expected: boolean; value: Record<string, unknown> }[] };
      shape: 'negative' | 'non-negative';
      name: string;
    };

function runCase(scenarioCase: ScenarioCase): void {
  const results = scenarioCase.input.validations.map((validation) => {
    const result = MutexQueueEntryEntity.validate(validation.value);
    assert.equal(result, validation.expected);
    return result;
  });

  assert.deepStrictEqual(results, scenarioCase.expected.validationResults);
}

void describe('mutex key transition event entity', () => {
  void it('validates complete transition events and rejects incomplete or unknown fields', () => {
    assert.equal(MutexKeyTransitionEventEntity.validate({ 'to': 'locked', 'type': 'transitionTo' }), true);
    assert.equal(MutexKeyTransitionEventEntity.validate({ 'type': 'transitionTo' }), false);
    assert.equal(MutexKeyTransitionEventEntity.validate({ 'to': 'invalid', 'type': 'transitionTo' }), false);
    assert.equal(MutexKeyTransitionEventEntity.validate({ 'ignored': true, 'to': 'locked', 'type': 'transitionTo' }), false);
  });
});

void describe('mutex queue entry entity', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
