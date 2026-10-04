import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineABStateEntity } from './entities/MachineABStateEntity.js';
import type { MachineLogEffectEntity } from './entities/MachineLogEffectEntity.js';
import type { MachineNestedEventEntity } from './entities/MachineNestedEventEntity.js';
import type { MachineNestedStateEntity } from './entities/MachineNestedStateEntity.js';
import type { MachineToggleEventEntity } from './entities/MachineToggleEventEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { InterpreterHistory } from '../../src/InterpreterHistory.js';
import { StateMachine } from '../../src/StateMachine.js';
import { InterpreterHistoryScenarioCaseEntity } from './entities/InterpreterHistoryScenarioCaseEntity.js';
import scenarioGroups from './InterpreterHistory.scenarios.json' with { 'type': 'json' };

class ToggleMachine extends StateMachine<
  MachineABStateEntity.Type,
  MachineToggleEventEntity.Type,
  MachineLogEffectEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineABStateEntity.Type {
    return { 'variant': 'a' };
  }

  override reduce(
    state: MachineABStateEntity.Type,
    _event: MachineToggleEventEntity.Type
  ): FsmStepInterface<MachineABStateEntity.Type, MachineLogEffectEntity.Type> {
    const next: MachineABStateEntity.Type =
      state.variant === 'a' ? { 'variant': 'b' } : { 'variant': 'a' };
    return { 'effects': [{ 'message': `now ${next.variant}`, 'variant': 'log' }], 'state': next };
  }
}

class SameVariantMachine extends StateMachine<
  MachineABStateEntity.Type,
  MachineToggleEventEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineABStateEntity.Type {
    return { 'variant': 'a' };
  }

  override reduce(
    state: MachineABStateEntity.Type,
    _event: MachineToggleEventEntity.Type
  ): FsmStepInterface<MachineABStateEntity.Type> {
    return { 'effects': [], 'state': state };
  }
}

class NestedMachine extends StateMachine<
  MachineNestedStateEntity.Type,
  MachineNestedEventEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineNestedStateEntity.Type {
    return { 'details': { 'value': 1 }, 'variant': 'a' };
  }
  override reduce(): FsmStepInterface<MachineNestedStateEntity.Type> {
    return { 'effects': [], 'state': { 'details': { 'value': 2 }, 'variant': 'b' } };
  }
}

class InterpreterHistoryRunners {
  static async 'deeply-isolated-history-records'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'deeply-isolated-history-records'
    >
  ): Promise<void> {
    const { eventDetails, replacementValues } = scenarioCase.input;
    const history = InterpreterHistory.create(new NestedMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await history.send({ 'details': eventDetails, 'type': 'toggle' });
    const snapshot = history.history()[0];
    assert.ok(snapshot !== undefined, 'Expected a history snapshot');
    snapshot.from.details.value = replacementValues.from;
    snapshot.to.details.value = replacementValues.to;
    snapshot.event.details.value = replacementValues.event;

    const retained = history.history()[0];
    assert.equal(retained?.from.details.value, scenarioCase.expected.fromValue);
    assert.equal(retained?.to.details.value, scenarioCase.expected.toValue);
    assert.equal(retained?.event.details.value, scenarioCase.expected.eventValue);
  }

  static 'empty-machine-id'(
    scenarioCase: ScenarioCaseOfType<InterpreterHistoryScenarioCaseEntity.Type, 'empty-machine-id'>
  ): void {
    assert.throws(
      () => {
        InterpreterHistory.create(new ToggleMachine(), {
          'capacity': scenarioCase.input.capacity,
          'machineId': scenarioCase.input.machineId
        });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static async 'evicts-oldest-when-capacity-exceeded'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'evicts-oldest-when-capacity-exceeded'
    >
  ): Promise<void> {
    const history = InterpreterHistory.create(new ToggleMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await InterpreterHistoryRunners.sendToggles(history, scenarioCase.input.steps);
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(
      records.map((record) => {
        const pair = { 'from': record.from, 'to': record.to };
        return pair;
      }),
      scenarioCase.expected.records
    );
  }

  static async 'fresh-array-each-call'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'fresh-array-each-call'
    >
  ): Promise<void> {
    const history = InterpreterHistory.create(new ToggleMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await InterpreterHistoryRunners.sendToggles(history, scenarioCase.input.steps);
    const first = history.history();
    const second = history.history();
    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    assert.equal(second.length, scenarioCase.expected.length);
    assert.equal(second === history.history(), false);
    assert.equal(second === first, scenarioCase.expected.sameReference);
  }

  static async 'fully-functional-effect-interpreter'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'fully-functional-effect-interpreter'
    >
  ): Promise<void> {
    const logged: string[] = [];
    const history = InterpreterHistory.create(
      new ToggleMachine(),
      {
        'capacity': scenarioCase.input.capacity,
        'machineId': scenarioCase.input.machineId
      },
      {
        'handler': (effect) => {
          logged.push(effect.message);
        }
      }
    );
    history.start();
    assert.deepEqual(history.getState(), scenarioCase.expected.initialState);
    await history.send({ 'type': 'toggle' });
    assert.deepEqual(history.getState(), scenarioCase.expected.finalState);
    assert.deepEqual(logged, scenarioCase.expected.logged);
    history.stop();
  }

  static 'history-empty-before-transitions'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'history-empty-before-transitions'
    >
  ): void {
    const history = InterpreterHistory.create(new ToggleMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    assert.deepEqual(history.history(), []);
    assert.deepEqual(history.getState(), scenarioCase.expected.initialState);
  }

  static async 'no-record-for-unchanged-state'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'no-record-for-unchanged-state'
    >
  ): Promise<void> {
    const history = InterpreterHistory.create(new SameVariantMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await history.send({ 'type': 'toggle' });
    assert.deepEqual(history.getState(), scenarioCase.expected.state);
    assert.deepEqual(history.history(), []);
    assert.equal(history.history().length, scenarioCase.expected.historyLength);
  }

  static 'non-integer-capacity'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'non-integer-capacity'
    >
  ): void {
    assert.throws(
      () => {
        InterpreterHistory.create(new ToggleMachine(), {
          'capacity': scenarioCase.input.capacity,
          'machineId': scenarioCase.input.machineId
        });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'non-positive-capacity'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'non-positive-capacity'
    >
  ): void {
    assert.throws(
      () => {
        InterpreterHistory.create(new ToggleMachine(), {
          'capacity': scenarioCase.input.capacity,
          'machineId': scenarioCase.input.machineId
        });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static async 'records-transitions-in-order'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'records-transitions-in-order'
    >
  ): Promise<void> {
    const history = InterpreterHistory.create(new ToggleMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await InterpreterHistoryRunners.sendToggles(history, scenarioCase.input.steps);
    const records = history.history();
    assert.equal(records.length, scenarioCase.expected.length);
    assert.deepEqual(
      records.map((record) => {
        const pair = { 'from': record.from, 'to': record.to };
        return pair;
      }),
      scenarioCase.expected.records
    );
  }

  static async 'snapshot-isolated-from-later-transitions'(
    scenarioCase: ScenarioCaseOfType<
      InterpreterHistoryScenarioCaseEntity.Type,
      'snapshot-isolated-from-later-transitions'
    >
  ): Promise<void> {
    const history = InterpreterHistory.create(new ToggleMachine(), {
      'capacity': scenarioCase.input.capacity,
      'machineId': scenarioCase.input.machineId
    });
    history.start();
    await history.send({ 'type': 'toggle' });
    const snapshot = history.history();
    await history.send({ 'type': 'toggle' });
    assert.equal(snapshot.length, scenarioCase.expected.snapshotLength);
    assert.equal(history.history().length, scenarioCase.expected.finalLength);
  }

  private static async sendToggles(
    history: InterpreterHistory<
      MachineABStateEntity.Type,
      MachineToggleEventEntity.Type,
      MachineLogEffectEntity.Type
    >,
    steps: number
  ): Promise<void> {
    for (let index = 0; index < steps; index++) {
      await history.send({ 'type': 'toggle' });
    }
  }
}

ScenarioSuite.register({
  'entity': InterpreterHistoryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'InterpreterHistory',
  'runners': InterpreterHistoryRunners
});
