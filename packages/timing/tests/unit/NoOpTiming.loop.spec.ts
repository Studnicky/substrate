import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NoOpTiming } from '../../src/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import { NoOpTimingScenarioCaseEntity } from './entities/NoOpTimingScenarioCaseEntity.js';
import scenarioGroups from './NoOpTiming.scenarios.json' with { type: 'json' };

type ScenarioCase = NoOpTimingScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(NoOpTimingScenarioCaseEntity.Schema, NoOpTimingScenarioCaseEntity.Node);

function createTimingEvent(input: Parameters<typeof TimingEvent.create>[0]): ReturnType<typeof TimingEvent.create> {
  return TimingEvent.create(input);
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'create-clear-event-get-events': (scenarioCase) => {
    const timer = NoOpTiming.create();
    const afterEvent = timer.event(createTimingEvent(scenarioCase.input.event));
    const afterClear = timer.clear();
    const events = timer.getEvents();

    assert.strictEqual(afterEvent, undefined);
    assert.strictEqual(afterClear, timer);
    assert.strictEqual(scenarioCase.expected.chainResult, afterClear === timer);
    assert.strictEqual(events.get('durationMs'), scenarioCase.expected.durationMs);
    assert.strictEqual([...events.keys()].length, 1);
    assert.strictEqual(scenarioCase.expected.sameInstance, true);
  },

  'get-events-empty': (scenarioCase) => {
    const timer = NoOpTiming.create();
    const events = timer.getEvents();
    assert.deepStrictEqual(events, new Map([['durationMs', scenarioCase.expected.durationMs]]));
    assert.strictEqual(scenarioCase.expected.empty, true);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('NoOpTiming', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }
});
