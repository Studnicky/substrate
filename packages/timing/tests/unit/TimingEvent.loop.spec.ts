import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TIMING_STATUS } from '../../src/constants/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import { TimingEventScenarioCaseEntity } from './entities/TimingEventScenarioCaseEntity.js';
import scenarioGroups from './TimingEvent.scenarios.json' with { type: 'json' };

type TimingStatus = (typeof TIMING_STATUS)[keyof typeof TIMING_STATUS];

type ScenarioCase = TimingEventScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: Shape }>) => void;
type RunnerMap = { [Shape in ScenarioShape]: ScenarioRunner<Shape> };

const fileIntake = ScenarioFileCompiler.compileIntake(TimingEventScenarioCaseEntity.Schema, TimingEventScenarioCaseEntity.Node);

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
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
