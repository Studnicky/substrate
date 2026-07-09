import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type DemoState = { readonly variant: 'idle' } | { readonly variant: 'active' };
type DemoEvent = { readonly type: 'activate' } | { readonly type: 'deactivate' };
type DemoEffect = { readonly variant: 'log'; readonly message: string };

class DemoMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
  getInitialState(): DemoState { return { variant: 'idle' }; }
  reduce(state: DemoState, event: DemoEvent): FsmStepType<DemoState, DemoEffect> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { state: { variant: 'active' }, effects: [{ variant: 'log', message: 'activated' }] };
    }
    if (state.variant === 'active' && event.type === 'deactivate') {
      return { state: { variant: 'idle' }, effects: [] };
    }
    return { state, effects: [] };
  }
}

describe('EffectInterpreter', () => {
  it('getState() throws before start()', () => {
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-1' });
    assert.throws(() => interp.getState(), /not started/);
  });

  it('send() throws before start()', async () => {
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-2' });
    await assert.rejects(() => interp.send({ type: 'activate' }), /not running/);
  });

  it('create throws FsmConfigError for empty machineId', () => {
    assert.throws(
      () => EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: '' }),
      { message: 'machineId must not be empty' }
    );
  });

  it('start() sets initial state and notifies observers', () => {
    const states: DemoState[] = [];
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-3' });
    interp.subscribe(s => states.push(s));
    interp.start();
    assert.deepEqual(interp.getState(), { variant: 'idle' });
    assert.equal(states.length, 1);
    assert.deepEqual(states[0], { variant: 'idle' });
  });

  it('send() transitions state and notifies observer', async () => {
    const states: DemoState[] = [];
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-4' });
    interp.subscribe(s => states.push(s));
    interp.start();
    await interp.send({ type: 'activate' });
    assert.deepEqual(interp.getState(), { variant: 'active' });
    assert.equal(states.length, 2); // initial + after activate
    assert.deepEqual(states[1], { variant: 'active' });
  });

  it('effect handler is called after transition', async () => {
    const logged: string[] = [];
    const interp = EffectInterpreter.create({
      machine: new DemoMachine(),
      handlers: { log: (e) => { logged.push(e.message); } },
      machineId: 'test-5',
    });
    interp.start();
    await interp.send({ type: 'activate' });
    assert.deepEqual(logged, ['activated']);
  });

  it('unsubscribe stops notifications', async () => {
    const states: DemoState[] = [];
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-6' });
    const unsub = interp.subscribe(s => states.push(s));
    interp.start();
    unsub();
    await interp.send({ type: 'activate' });
    assert.equal(states.length, 1); // only initial notification before unsub
  });

  it('processes events FIFO', async () => {
    const interp = EffectInterpreter.create({ machine: new DemoMachine(), handlers: {}, machineId: 'test-7' });
    interp.start();
    const p1 = interp.send({ type: 'activate' });
    const p2 = interp.send({ type: 'deactivate' });
    await Promise.all([p1, p2]);
    assert.deepEqual(interp.getState(), { variant: 'idle' });
  });

  it('effect handler dispatch() causes the dispatched event to be processed within the same send() call', async () => {
    const interp = EffectInterpreter.create({
      machine: new DemoMachine(),
      handlers: {
        log: (_effect, dispatch) => { dispatch({ type: 'deactivate' }); },
      },
      machineId: 'test-8',
    });
    interp.start();
    await interp.send({ type: 'activate' });
    // 'activate' (idle -> active, effect dispatches 'deactivate') then 'deactivate' (active -> idle)
    // both resolve before send() returns.
    assert.deepEqual(interp.getState(), { variant: 'idle' });
  });

  it('a rejected transition does not permanently wedge the interpreter — a later send() still drains', async () => {
    class RejectingMachine extends StateMachine<DemoState, DemoEvent, DemoEffect> {
      getInitialState(): DemoState { return { variant: 'idle' }; }
      reduce(state: DemoState, event: DemoEvent): FsmStepType<DemoState, DemoEffect> {
        if (event.type === 'deactivate') { throw new Error('deliberately rejected'); }
        if (state.variant === 'idle' && event.type === 'activate') {
          return { state: { variant: 'active' }, effects: [] };
        }
        return { state, effects: [] };
      }
    }

    const interp = EffectInterpreter.create({
      machine: new RejectingMachine(),
      handlers: {},
      machineId: 'test-9',
    });
    interp.start();

    await assert.rejects(() => interp.send({ type: 'deactivate' }));

    // Before the fix, #draining stayed stuck true after the throw above, so this
    // send() would silently no-op — the mailbox would fill but never drain.
    await interp.send({ type: 'activate' });
    assert.deepEqual(interp.getState(), { variant: 'active' });
  });
});
