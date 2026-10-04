import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { TimingEventInputEntity } from '../../../src/timing/entities/TimingEventInputEntity.js';
import { TimingEvent } from '../../../src/timing/modules/TimingEvent.js';
import { TimingEventScenarioCaseEntity } from './entities/TimingEventScenarioCaseEntity.js';
import scenarioGroups from './TimingEvent.scenarios.json' with { 'type': 'json' };

class TimingEventRunners {
  static 'component-operation-format'(
    scenarioCase: ScenarioCaseOfType<
      TimingEventScenarioCaseEntity.Type,
      'component-operation-format'
    >
  ): void {
    const data = TimingEvent.create(scenarioCase.input);
    assert.deepEqual(data, { 'event': scenarioCase.expected.event });
  }

  static 'domain-specific-status'(
    scenarioCase: ScenarioCaseOfType<TimingEventScenarioCaseEntity.Type, 'domain-specific-status'>
  ): void {
    const data = TimingEvent.create(scenarioCase.input);
    assert.equal(data.event, scenarioCase.expected.event);
  }

  static 'immutable-event-data'(
    scenarioCase: ScenarioCaseOfType<TimingEventScenarioCaseEntity.Type, 'immutable-event-data'>
  ): void {
    const data = TimingEvent.create(scenarioCase.input);
    assert.equal(Object.isFrozen(data), scenarioCase.expected.frozen);
  }

  static 'includes-status'(
    scenarioCase: ScenarioCaseOfType<TimingEventScenarioCaseEntity.Type, 'includes-status'>
  ): void {
    const data = TimingEvent.create(scenarioCase.input);
    assert.deepEqual(data, { 'event': scenarioCase.expected.event });
  }

  static 'independent-event-values'(
    scenarioCase: ScenarioCaseOfType<
      TimingEventScenarioCaseEntity.Type,
      'independent-event-values'
    >
  ): void {
    const first = TimingEvent.create(scenarioCase.input.first);
    const second = TimingEvent.create(scenarioCase.input.second);
    assert.equal(first.event, scenarioCase.expected.firstEvent);
    assert.equal(second.event, scenarioCase.expected.secondEvent);
  }

  static 'missing-component'(
    scenarioCase: ScenarioCaseOfType<TimingEventScenarioCaseEntity.Type, 'missing-component'>
  ): void {
    assert.throws(() => {
      TimingEventInputEntity.intake({ 'operation': scenarioCase.input.operation });
    });
  }

  static 'missing-operation'(
    scenarioCase: ScenarioCaseOfType<TimingEventScenarioCaseEntity.Type, 'missing-operation'>
  ): void {
    assert.throws(() => {
      TimingEventInputEntity.intake({ 'component': scenarioCase.input.component });
    });
  }
}

ScenarioSuite.register({
  'entity': TimingEventScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'TimingEvent',
  'runners': TimingEventRunners
});
