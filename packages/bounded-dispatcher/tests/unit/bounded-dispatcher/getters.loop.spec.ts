import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { EventBus } from '@studnicky/event-bus/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/interfaces/index.js';

import { BoundedDispatcher } from '../../../src/index.js';
import { GettersScenarioCaseEntity } from '../entities/GettersScenarioCaseEntity.js';
import scenarioGroups from './getters.scenarios.json' with { 'type': 'json' };

class GettersCaseRunner {
  static 'getBus-default'(
    scenarioCase: ScenarioCaseOfType<GettersScenarioCaseEntity.Type, 'getBus-default'>
  ): void {
    const dispatcher = BoundedDispatcher.create();
    const { expected, input } = scenarioCase;
    assert.ok(dispatcher.getBus() instanceof EventBus);
    assert.strictEqual(dispatcher.getBus().constructor.name, expected.busShape);
    assert.strictEqual(input.busShape, expected.busShape);
  }

  static 'getBus-preserves-instance'(
    scenarioCase: ScenarioCaseOfType<GettersScenarioCaseEntity.Type, 'getBus-preserves-instance'>
  ): void {
    const bus = EventBus.create<BoundedDispatcherTopicMapInterface>();
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcher.create({ 'bus': bus });
    assert.ok(Object.is(dispatcher.getBus(), bus));
    assert.strictEqual(expected.sameInstance, true);
    assert.strictEqual(input.sameInstance, true);
  }
}

ScenarioSuite.register({
  'entity': GettersScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BoundedDispatcher getBus()',
  'runners': GettersCaseRunner
});
