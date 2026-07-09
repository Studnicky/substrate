import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { InterpreterHistory } from '../../src/InterpreterHistory.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type ToggleState = { readonly variant: 'a' } | { readonly variant: 'b' };
type ToggleEvent = { readonly type: 'toggle' };
type ToggleEffect = { readonly variant: 'log'; readonly message: string };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent, ToggleEffect> {
  getInitialState(): ToggleState { return { variant: 'a' }; }
  reduce(state: ToggleState, _event: ToggleEvent): FsmStepType<ToggleState, ToggleEffect> {
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
    assert.deepEqual(records[0], { event: { type: 'toggle' }, from: { variant: 'a' }, to: { variant: 'b' }, timestamp: records[0]?.timestamp });
    assert.deepEqual(records[1]?.from, { variant: 'b' });
    assert.deepEqual(records[1]?.to, { variant: 'a' });
    assert.deepEqual(records[2]?.from, { variant: 'a' });
    assert.deepEqual(records[2]?.to, { variant: 'b' });
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

  it('history() returns a snapshot — mutating it does not affect internal state', async () => {
    const history = InterpreterHistory.create({ capacity: 5, machine: new ToggleMachine(), machineId: 'snapshot' });
    history.start();
    await history.send({ type: 'toggle' });

    const records = history.history();
    records.push({ event: { type: 'toggle' }, from: { variant: 'a' }, to: { variant: 'b' }, timestamp: 0 });
    records.pop();
    records.pop();

    assert.equal(history.history().length, 1);
  });

  it('behaves as a fully-functional EffectInterpreter — start/send/stop work identically to the base class', async () => {
    const logged: string[] = [];
    const history = InterpreterHistory.create({
      capacity: 5,
      machine: new ToggleMachine(),
      handlers: { log: (effect) => { logged.push(effect.message); } },
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
