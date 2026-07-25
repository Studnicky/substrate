import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { InterpreterHistory } from '../../src/InterpreterHistory.js';
import { StateMachine } from '../../src/StateMachine.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';
import scenarioGroups from './InterpreterHistory.scenarios.json';

type ToggleState = { readonly variant: 'a' } | { readonly variant: 'b' };
type ToggleEvent = { readonly type: 'toggle' };
type ToggleEffect = { readonly message: string; readonly variant: 'log' };

type ScenarioCase =
  | {
      description: string;
      expected: { message: string };
      input: { capacity: number; machineId: string };
      shape: 'missing-machine' | 'empty-machine-id' | 'non-positive-capacity' | 'non-integer-capacity';
      name: string;
    }
  | {
      description: string;
      expected: { historyLength: 0; initialState: ToggleState };
      input: { capacity: number; machineId: string };
      shape: 'history-empty-before-transitions';
      name: string;
    }
  | {
      description: string;
      expected: {
        length: number;
        records: Array<{ from: ToggleState; to: ToggleState }>;
      };
      input: { capacity: number; machineId: string; steps: number };
      shape: 'records-transitions-in-order';
      name: string;
    }
  | {
      description: string;
      expected: { historyLength: 0; state: ToggleState };
      input: { capacity: number; machineId: string };
      shape: 'no-record-for-unchanged-state';
      name: string;
    }
  | {
      description: string;
      expected: {
        length: number;
        records: Array<{ from: ToggleState; to: ToggleState }>;
      };
      input: { capacity: number; machineId: string; steps: number };
      shape: 'evicts-oldest-when-capacity-exceeded';
      name: string;
    }
  | {
      description: string;
      expected: { finalLength: number; snapshotLength: number };
      input: { capacity: number; machineId: string; steps: number };
      shape: 'snapshot-isolated-from-later-transitions';
      name: string;
    }
  | {
      description: string;
      expected: { length: number; sameReference: false };
      input: { capacity: number; machineId: string; steps: number };
      shape: 'fresh-array-each-call';
      name: string;
    }
  | {
      description: string;
      expected: { eventValue: number; fromValue: number; toValue: number };
      input: {
        capacity: number;
        eventDetails: { value: number };
        machineId: string;
        replacementValues: { event: number; from: number; to: number };
      };
      shape: 'deeply-isolated-history-records';
      name: string;
    }
  | {
      description: string;
      expected: { finalState: ToggleState; initialState: ToggleState; logged: string[] };
      input: { capacity: number; machineId: string; message: string };
      shape: 'fully-functional-effect-interpreter';
      name: string;
    };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent, ToggleEffect> {
  override getInitialState(): ToggleState { return { variant: 'a' }; }

  override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState, ToggleEffect> {
    const next: ToggleState = state.variant === 'a' ? { variant: 'b' } : { variant: 'a' };
    return { state: next, effects: [{ variant: 'log', message: `now ${next.variant}` }] };
  }
}

async function sendToggles(history: InterpreterHistory<ToggleState, ToggleEvent, ToggleEffect>, steps: number): Promise<void> {
  for (let index = 0; index < steps; index++) {
    await history.send({ type: 'toggle' });
  }
}

function createSameVariantMachine(): StateMachine<ToggleState, ToggleEvent> {
  class SameVariantMachine extends StateMachine<ToggleState, ToggleEvent> {
    override getInitialState(): ToggleState { return { variant: 'a' }; }

    override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
      return { state, effects: [] };
    }
  }

  return new SameVariantMachine();
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'empty-machine-id': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId }),
      { message: scenarioCase.expected.message }
    );
  },
  'evicts-oldest-when-capacity-exceeded': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, scenarioCase.input.steps);
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(records.map((record) => ({ from: record.from, to: record.to })), scenarioCase.expected.records);
  },
  'fresh-array-each-call': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, scenarioCase.input.steps);
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
    const history = InterpreterHistory.create({
      capacity: scenarioCase.input.capacity,
      handler: (effect) => { logged.push(effect.message); },
      machine: new ToggleMachine(),
      machineId: scenarioCase.input.machineId,
    });
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
      override getInitialState(): NestedState { return { details: { value: 1 }, variant: 'a' }; }
      override reduce(): FsmStepInterface<NestedState> {
        return { effects: [], state: { details: { value: 2 }, variant: 'b' } };
      }
    }

    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new NestedMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    await history.send({ details: scenarioCase.input.eventDetails, type: 'toggle' });
    const snapshot = history.history()[0];
    if (snapshot === undefined) {
      throw new Error('Expected a history snapshot');
    }
    snapshot.from.details.value = scenarioCase.input.replacementValues.from;
    snapshot.to.details.value = scenarioCase.input.replacementValues.to;
    snapshot.event.details.value = scenarioCase.input.replacementValues.event;

    const retained = history.history()[0];
    assert.equal(retained?.from.details.value, scenarioCase.expected.fromValue);
    assert.equal(retained?.to.details.value, scenarioCase.expected.toValue);
    assert.equal(retained?.event.details.value, scenarioCase.expected.eventValue);
  },
  'history-empty-before-transitions': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    assert.deepEqual(history.history(), []);
    assert.deepEqual(history.getState(), scenarioCase.expected.initialState);
  },
  'missing-machine': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: undefined, machineId: scenarioCase.input.machineId }),
      { message: scenarioCase.expected.message }
    );
  },
  'no-record-for-unchanged-state': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: createSameVariantMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    await history.send({ type: 'toggle' });
    assert.deepEqual(history.getState(), scenarioCase.expected.state);
    assert.deepEqual(history.history(), []);
    assert.equal(history.history().length, scenarioCase.expected.historyLength);
  },
  'non-integer-capacity': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId }),
      { message: scenarioCase.expected.message }
    );
  },
  'non-positive-capacity': async (scenarioCase) => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId }),
      { message: scenarioCase.expected.message }
    );
  },
  'records-transitions-in-order': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId });
    history.start();
    await sendToggles(history, scenarioCase.input.steps);
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(
      records.map((record) => ({ from: record.from, to: record.to })),
      scenarioCase.expected.records
    );
  },
  'snapshot-isolated-from-later-transitions': async (scenarioCase) => {
    const history = InterpreterHistory.create({ capacity: scenarioCase.input.capacity, machine: new ToggleMachine(), machineId: scenarioCase.input.machineId });
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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
