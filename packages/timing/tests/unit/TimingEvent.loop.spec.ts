import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TIMING_STATUS } from '../../src/constants/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import scenarioGroups from './TimingEvent.scenarios.json' with { type: 'json' };

type TimingStatus = (typeof TIMING_STATUS)[keyof typeof TIMING_STATUS];
type TimingEventInput = { component: string; operation: string };
type TimingEventWithStatusInput = TimingEventInput & { status: TimingStatus };

type ScenarioBase<
  Shape extends string,
  Input extends Record<string, unknown>,
  Expected extends Record<string, unknown>
> = {
  description: string;
  expected: Expected;
  input: Input;
  shape: Shape;
  name: string;
};

type ScenarioCaseByShape = {
  'component-operation-format': ScenarioBase<'component-operation-format', TimingEventInput, { event: string }>;
  'domain-specific-status': ScenarioBase<'domain-specific-status', TimingEventWithStatusInput, { event: string }>;
  'immutable-event-data': ScenarioBase<'immutable-event-data', TimingEventInput, { frozen: true }>;
  'includes-status': ScenarioBase<'includes-status', TimingEventWithStatusInput, { event: string }>;
  'independent-event-values': ScenarioBase<'independent-event-values', { first: TimingEventInput; second: TimingEventInput }, { firstEvent: string; secondEvent: string }>;
  'missing-component': ScenarioBase<'missing-component', { operation: string }, { errorName: string }>;
  'missing-operation': ScenarioBase<'missing-operation', { component: string }, { errorName: string }>;
};

type ScenarioShape = keyof ScenarioCaseByShape;
type ScenarioCase = ScenarioCaseByShape[ScenarioShape];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioShape]: ScenarioRunner<Shape> };

function createInvalidTimingEvent(input: { component?: string; operation?: string; status?: TimingStatus }): void {
  Reflect.apply(TimingEvent.create, TimingEvent, [input]);
}

const runnerMap: RunnerMap = {
  'component-operation-format': (scenarioCase) => {
    const data = TimingEvent.create(scenarioCase.input);
    assert.deepEqual(data, { event: scenarioCase.expected.event });
    return;
  },
  'domain-specific-status': (scenarioCase) => {
    const data = TimingEvent.create(scenarioCase.input);
    assert.equal(data.event, scenarioCase.expected.event);
    return;
  },
  'immutable-event-data': (scenarioCase) => {
    const data = TimingEvent.create(scenarioCase.input);
    assert.equal(Object.isFrozen(data), scenarioCase.expected.frozen);
    return;
  },
  'includes-status': (scenarioCase) => {
    const data = TimingEvent.create(scenarioCase.input);
    assert.deepEqual(data, { event: scenarioCase.expected.event });
    return;
  },
  'independent-event-values': (scenarioCase) => {
    const first = TimingEvent.create(scenarioCase.input.first);
    const second = TimingEvent.create(scenarioCase.input.second);
    assert.equal(first.event, scenarioCase.expected.firstEvent);
    assert.equal(second.event, scenarioCase.expected.secondEvent);
    return;
  },
  'missing-component': (scenarioCase) => {
    assert.throws(() => {
      createInvalidTimingEvent({ operation: scenarioCase.input.operation });
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, scenarioCase.expected.errorName);
      assert.match(error.message, /TimingEvent requires component/);
      return true;
    });
    return;
  },
  'missing-operation': (scenarioCase) => {
    assert.throws(() => {
      createInvalidTimingEvent({ component: scenarioCase.input.component });
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, scenarioCase.expected.errorName);
      assert.match(error.message, /TimingEvent requires operation/);
      return true;
    });
    return;
  }
};

function runCase<Shape extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: Shape }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('TimingEvent', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
