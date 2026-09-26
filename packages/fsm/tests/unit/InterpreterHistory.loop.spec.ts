import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { InterpreterHistory } from '../../src/InterpreterHistory.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import { InterpreterHistoryScenarioCaseEntity } from './entities/InterpreterHistoryScenarioCaseEntity.js';
import scenarioGroups from './InterpreterHistory.scenarios.json' with { type: 'json' };

type ToggleState = { readonly variant: 'a' } | { readonly variant: 'b' };
type ToggleEvent = { readonly type: 'toggle' };
type ToggleEffect = { readonly message: string; readonly variant: 'log' };

type ScenarioCase = InterpreterHistoryScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(InterpreterHistoryScenarioCaseEntity.Schema, InterpreterHistoryScenarioCaseEntity.Node);

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent, ToggleEffect> {
  public constructor() { super(); }

  override getInitialState(): ToggleState { return { variant: 'a' }; }

  override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState, ToggleEffect> {
    const next: ToggleState = state.variant === 'a' ? { variant: 'b' } : { variant: 'a' };
    return { state: next, effects: [{ variant: 'log', message: `now ${next.variant}` }] };
  }
}

function createToggleMachine(): StateMachine<ToggleState, ToggleEvent, ToggleEffect> {
  return new ToggleMachine();
}

async function sendToggles(history: InterpreterHistory<ToggleState, ToggleEvent, ToggleEffect>, steps: number): Promise<void> {
  for (let index = 0; index < steps; index++) {
    await history.send({ type: 'toggle' });
  }
}

function createSameVariantMachine(): StateMachine<ToggleState, ToggleEvent> {
  class SameVariantMachine extends StateMachine<ToggleState, ToggleEvent> {
    public constructor() { super(); }

    override getInitialState(): ToggleState { return { variant: 'a' }; }

    override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
      return { state, effects: [] };
    }
  }

  return new SameVariantMachine();
}

function requireSteps(scenarioCase: ScenarioCase): number {
  const { steps } = scenarioCase.input;
  if (steps === undefined) {
    throw RuntimeError.create('Expected a scenario step count');
  }
  return steps;
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'empty-machine-id': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId }),
      { message: String(scenarioCase.expected.message) }
    );
  },
  'evicts-oldest-when-capacity-exceeded': async (scenarioCase) => {
    const history = InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, requireSteps(scenarioCase));
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(records.map((record) => ({ from: record.from, to: record.to })), scenarioCase.expected.records);
  },
  'fresh-array-each-call': async (scenarioCase) => {
    const history = InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, requireSteps(scenarioCase));
    const first = history.history();
    const second = history.history();
    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    assert.equal(second.length, scenarioCase.expected.length);
    assert.equal(second === history.history(), false);
    assert.equal((second === first), scenarioCase.expected.sameReference);
  },
  'fully-functional-effect-interpreter': async (scenarioCase) => {
    const logged: string[] = [];
    const history = InterpreterHistory.create(
      createToggleMachine(),
      {
        capacity: scenarioCase.input.capacity,
        machineId: scenarioCase.input.machineId,
      },
      {
        handler: (effect) => { logged.push(effect.message); },
      }
    );
    history.start();
    assert.deepEqual(history.getState(), scenarioCase.expected.initialState);
    await history.send({ type: 'toggle' });
    assert.deepEqual(history.getState(), scenarioCase.expected.finalState);
    assert.deepEqual(logged, scenarioCase.expected.logged);
    history.stop();
  },
  'deeply-isolated-history-records': async (scenarioCase) => {
    type NestedState = { readonly variant: 'a' | 'b'; details: { value: number } };
    type NestedEvent = { readonly type: 'toggle'; details: { value: number } };

    class NestedMachine extends StateMachine<NestedState, NestedEvent> {
      public constructor() { super(); }

      override getInitialState(): NestedState { return { details: { value: 1 }, variant: 'a' }; }
      override reduce(): FsmStepInterface<NestedState> {
        return { effects: [], state: { details: { value: 2 }, variant: 'b' } };
      }
    }

    function createNestedMachine(): StateMachine<NestedState, NestedEvent> {
      return new NestedMachine();
    }

    const { eventDetails, replacementValues } = scenarioCase.input;
    if (eventDetails === undefined || replacementValues === undefined) {
      throw RuntimeError.create('Expected eventDetails and replacementValues for deeply-isolated-history-records');
    }

    const history = InterpreterHistory.create(createNestedMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await history.send({ details: eventDetails, type: 'toggle' });
    const snapshot = history.history()[0];
    if (snapshot === undefined) {
      throw RuntimeError.create('Expected a history snapshot');
    }
    snapshot.from.details.value = replacementValues.from;
    snapshot.to.details.value = replacementValues.to;
    snapshot.event.details.value = replacementValues.event;

    const retained = history.history()[0];
    assert.equal(retained?.from.details.value, scenarioCase.expected.fromValue);
    assert.equal(retained?.to.details.value, scenarioCase.expected.toValue);
    assert.equal(retained?.event.details.value, scenarioCase.expected.eventValue);
  },
  'history-empty-before-transitions': async (scenarioCase) => {
    const history = InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    assert.deepEqual(history.history(), []);
    assert.deepEqual(history.getState(), scenarioCase.expected.initialState);
  },
  'no-record-for-unchanged-state': async (scenarioCase) => {
    const history = InterpreterHistory.create(createSameVariantMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await history.send({ type: 'toggle' });
    assert.deepEqual(history.getState(), scenarioCase.expected.state);
    assert.deepEqual(history.history(), []);
    assert.equal(history.history().length, scenarioCase.expected.historyLength);
  },
  'non-integer-capacity': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId }),
      { message: String(scenarioCase.expected.message) }
    );
  },
  'non-positive-capacity': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId }),
      { message: String(scenarioCase.expected.message) }
    );
  },
  'records-transitions-in-order': async (scenarioCase) => {
    const history = InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, requireSteps(scenarioCase));
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(
      records.map((record) => ({ from: record.from, to: record.to })),
      scenarioCase.expected.records
    );
  },
  'snapshot-isolated-from-later-transitions': async (scenarioCase) => {
    const history = InterpreterHistory.create(createToggleMachine(), { capacity: scenarioCase.input.capacity, machineId: scenarioCase.input.machineId });
    history.start();
    await history.send({ type: 'toggle' });
    const snapshot = history.history();
    await history.send({ type: 'toggle' });
    assert.equal(snapshot.length, scenarioCase.expected.snapshotLength);
    assert.equal(history.history().length, scenarioCase.expected.finalLength);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('InterpreterHistory', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
