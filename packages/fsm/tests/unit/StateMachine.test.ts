import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import type { FsmStepType } from '../../src/FsmStepType.js';

type ToggleState = { readonly variant: 'on' } | { readonly variant: 'off' };
type ToggleEvent = { readonly type: 'toggle' };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(state: ToggleState, _event: ToggleEvent): FsmStepType<ToggleState> {
    return { state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }, effects: [] };
  }
}

class ThrowingMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(_state: ToggleState, _event: ToggleEvent): FsmStepType<ToggleState> {
    throw new Error('boom');
  }
}

describe('StateMachine', () => {
  it('transitions off → on', () => {
    const machine = new ToggleMachine();
    const step = machine.transition({ variant: 'off' }, { type: 'toggle' });
    assert.deepEqual(step.state, { variant: 'on' });
    assert.deepEqual(step.effects, []);
  });

  it('transitions on → off', () => {
    const machine = new ToggleMachine();
    const step = machine.transition({ variant: 'on' }, { type: 'toggle' });
    assert.deepEqual(step.state, { variant: 'off' });
    assert.deepEqual(step.effects, []);
  });

  it('wraps reducer throw as ReducerThrewError', () => {
    const machine = new ThrowingMachine();
    assert.throws(
      () => machine.transition({ variant: 'off' }, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        assert.equal(err.eventType, 'toggle');
        assert.equal(err.stateVariant, 'off');
        return true;
      }
    );
  });
});
