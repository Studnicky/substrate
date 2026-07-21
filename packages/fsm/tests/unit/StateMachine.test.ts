import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine } from '../../src/StateMachine.js';
import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { TransitionRejectedError } from '../../src/TransitionRejectedError.js';
import { MachineTerminatedError } from '../../src/MachineTerminatedError.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';

type ToggleState = { readonly variant: 'on' } | { readonly variant: 'off' };
type ToggleEvent = { readonly type: 'toggle' };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    return { state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }, effects: [] };
  }
}

class ThrowingMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(_state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw new Error('boom');
  }
}

class DeliberatelyRejectingMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(state: ToggleState, event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw new TransitionRejectedError({
      eventType: event.type,
      reason: 'toggle is disabled',
      stateVariant: state.variant
    });
  }
}

class TerminatingMachine extends StateMachine<ToggleState, ToggleEvent> {
  getInitialState(): ToggleState { return { variant: 'off' }; }
  reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    return { state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }, effects: [] };
  }
  protected override isTerminated(state: ToggleState): boolean {
    return state.variant === 'on';
  }
}

describe('StateMachine', () => {
  const transitionScenarios: Array<{
    description: string;
    input: ToggleState;
    expectedVariant: 'on' | 'off';
  }> = [
    { description: 'transitions off → on', input: { variant: 'off' }, expectedVariant: 'on' },
    { description: 'transitions on → off', input: { variant: 'on' }, expectedVariant: 'off' },
  ];
  for (const { description, input, expectedVariant } of transitionScenarios) {
    it(description, () => {
      const machine = new ToggleMachine();
      const step = machine.transition(input, { type: 'toggle' });
      assert.deepEqual(step.state, { variant: expectedVariant });
      assert.deepEqual(step.effects, []);
    });
  }

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

  it('reducer throwing TransitionRejectedError surfaces as TransitionRejectedError, not wrapped', () => {
    const machine = new DeliberatelyRejectingMachine();
    assert.throws(
      () => machine.transition({ variant: 'off' }, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof TransitionRejectedError);
        assert.ok(!(err instanceof ReducerThrewError));
        assert.equal(err.eventType, 'toggle');
        assert.equal(err.stateVariant, 'off');
        return true;
      }
    );
  });

  it('reducer throwing a plain Error still surfaces as ReducerThrewError (not TransitionRejectedError)', () => {
    const machine = new ThrowingMachine();
    assert.throws(
      () => machine.transition({ variant: 'off' }, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        assert.ok(!(err instanceof TransitionRejectedError));
        return true;
      }
    );
  });

  it('isTerminated blocks further transition() calls with MachineTerminatedError, without invoking reduce', () => {
    const machine = new TerminatingMachine();
    const onState = machine.transition({ variant: 'off' }, { type: 'toggle' });
    assert.deepEqual(onState.state, { variant: 'on' });

    assert.throws(
      () => machine.transition(onState.state, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof MachineTerminatedError);
        assert.equal(err.eventType, 'toggle');
        assert.equal(err.stateVariant, 'on');
        return true;
      }
    );
  });

  it('onTerminatedAccess fires when transition() is called against a terminated state', () => {
    const calls: Array<{ state: string; event: string }> = [];
    class ObservedTerminatingMachine extends TerminatingMachine {
      protected override onTerminatedAccess(state: ToggleState, event: ToggleEvent): void {
        calls.push({ state: state.variant, event: event.type });
      }
    }
    const machine = new ObservedTerminatingMachine();
    assert.throws(() => machine.transition({ variant: 'on' }, { type: 'toggle' }), MachineTerminatedError);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { state: 'on', event: 'toggle' });
  });
});
