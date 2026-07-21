import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { InterpreterHistory } from '../../src/InterpreterHistory.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';

type ToggleState = { readonly variant: 'a' } | { readonly variant: 'b' };
type ToggleEvent = { readonly type: 'toggle' };
type ToggleEffect = { readonly variant: 'log'; readonly message: string };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent, ToggleEffect> {
  getInitialState(): ToggleState { return { variant: 'a' }; }
  reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState, ToggleEffect> {
    const next: ToggleState = state.variant === 'a' ? { variant: 'b' } : { variant: 'a' };
    return { state: next, effects: [{ variant: 'log', message: `now ${next.variant}` }] };
  }
}

describe('InterpreterHistory', () => {
  it('create() throws FsmConfigError when machine is missing', () => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: 1, machine: undefined, machineId: 'x' }),
      { message: 'machine is required' }
    );
  });

  it('create() throws FsmConfigError for empty machineId', () => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: 1, machine: new ToggleMachine(), machineId: '' }),
      { message: 'machineId must not be empty' }
    );
  });

  it('create() throws FsmConfigError for a non-positive capacity', () => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: 0, machine: new ToggleMachine(), machineId: 'x' }),
      { message: 'capacity must be a positive integer' }
    );
  });

  it('create() throws FsmConfigError for a non-integer capacity', () => {
    assert.throws(
      () => InterpreterHistory.create({ capacity: 1.5, machine: new ToggleMachine(), machineId: 'x' }),
      { message: 'capacity must be a positive integer' }
    );
  });

  it('history() is empty before any transitions', () => {
    const history = InterpreterHistory.create({ capacity: 5, machine: new ToggleMachine(), machineId: 'empty' });
    history.start();
    assert.deepEqual(history.history(), []);
  });

  it('records transitions in order, oldest first', async () => {
    const history = InterpreterHistory.create({ capacity: 5, machine: new ToggleMachine(), machineId: 'ordered' });
    history.start();
    await history.send({ type: 'toggle' });
    await history.send({ type: 'toggle' });
    await history.send({ type: 'toggle' });

    const records = history.history();
    assert.equal(records.length, 3);
    const firstRecord = records[0];
    if (firstRecord === undefined) {
      throw new Error('Expected the first transition record');
    }
    assert.deepEqual(firstRecord.event, { type: 'toggle' });
    assert.deepEqual(firstRecord.from, { variant: 'a' });
    assert.deepEqual(firstRecord.to, { variant: 'b' });
    assert.equal(typeof firstRecord.timestamp, 'number');
    assert.deepEqual(records[1]?.from, { variant: 'b' });
    assert.deepEqual(records[1]?.to, { variant: 'a' });
    assert.deepEqual(records[2]?.from, { variant: 'a' });
    assert.deepEqual(records[2]?.to, { variant: 'b' });
  });

  it('does not record a successful send when the state variant does not change', async () => {
    class SameVariantMachine extends StateMachine<ToggleState, ToggleEvent> {
      getInitialState(): ToggleState { return { variant: 'a' }; }

      reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
        return { state, effects: [] };
      }
    }

    const history = InterpreterHistory.create({ capacity: 5, machine: new SameVariantMachine(), machineId: 'same-variant' });
    history.start();
    await history.send({ type: 'toggle' });

    assert.deepEqual(history.getState(), { variant: 'a' });
    assert.deepEqual(history.history(), []);
  });

  it('evicts the oldest record once capacity is exceeded', async () => {
    const history = InterpreterHistory.create({ capacity: 2, machine: new ToggleMachine(), machineId: 'bounded' });
    history.start();
    await history.send({ type: 'toggle' }); // a -> b
    await history.send({ type: 'toggle' }); // b -> a
    await history.send({ type: 'toggle' }); // a -> b, evicts the first record

    const records = history.history();
    assert.equal(records.length, 2);
    assert.deepEqual(records[0]?.from, { variant: 'b' });
    assert.deepEqual(records[0]?.to, { variant: 'a' });
    assert.deepEqual(records[1]?.from, { variant: 'a' });
    assert.deepEqual(records[1]?.to, { variant: 'b' });
  });

  it('history() returns a readonly snapshot isolated from later transitions', async () => {
    const history = InterpreterHistory.create({ capacity: 5, machine: new ToggleMachine(), machineId: 'snapshot' });
    history.start();
    await history.send({ type: 'toggle' });

    const snapshot = history.history();
    await history.send({ type: 'toggle' });

    assert.equal(snapshot.length, 1);
    assert.equal(history.history().length, 2);
  });

  it('history() returns a fresh, order-stable array on each call, independent of prior calls', async () => {
    const history = InterpreterHistory.create({ capacity: 5, machine: new ToggleMachine(), machineId: 'repeated-read' });
    history.start();
    await history.send({ type: 'toggle' });
    await history.send({ type: 'toggle' });
    await history.send({ type: 'toggle' });

    const first = history.history();
    const second = history.history();

    assert.notEqual(first, second);
    assert.deepEqual(first, second);
    assert.equal(second.length, 3);
    assert.deepEqual(history.history(), second);
  });

  it('history() deeply isolates returned records from retained history', async () => {
    type NestedState = { readonly variant: 'a' | 'b'; details: { value: number } };
    type NestedEvent = { readonly type: 'toggle'; details: { value: number } };

    class NestedMachine extends StateMachine<NestedState, NestedEvent> {
      getInitialState(): NestedState { return { 'details': { 'value': 1 }, 'variant': 'a' }; }
      reduce(): FsmStepInterface<NestedState> {
        return { 'effects': [], 'state': { 'details': { 'value': 2 }, 'variant': 'b' } };
      }
    }

    const history = InterpreterHistory.create({ 'capacity': 2, 'machine': new NestedMachine(), 'machineId': 'nested-history' });
    history.start();
    await history.send({ 'details': { 'value': 3 }, 'type': 'toggle' });

    const snapshot = history.history()[0];
    if (snapshot === undefined) {
      throw new Error('Expected a history snapshot');
    }
    snapshot.from.details.value = 99;
    snapshot.to.details.value = 98;
    snapshot.event.details.value = 97;

    const retained = history.history()[0];
    assert.equal(retained?.from.details.value, 1);
    assert.equal(retained?.to.details.value, 2);
    assert.equal(retained?.event.details.value, 3);
  });

  it('behaves as a fully-functional EffectInterpreter — start/send/stop work identically to the base class', async () => {
    const logged: string[] = [];
    const history = InterpreterHistory.create({
      capacity: 5,
      machine: new ToggleMachine(),
      handler: (effect) => { logged.push(effect.message); },
      machineId: 'functional',
    });
    history.start();
    assert.deepEqual(history.getState(), { variant: 'a' });
    await history.send({ type: 'toggle' });
    assert.deepEqual(history.getState(), { variant: 'b' });
    assert.deepEqual(logged, ['now b']);
    history.stop();
  });
});
