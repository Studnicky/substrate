import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import { TransitionRejectedError } from '../../src/TransitionRejectedError.js';
import { MachineTerminatedError } from '../../src/MachineTerminatedError.js';
import type { FsmStepInterface } from '../../src/FsmStepInterface.js';
import scenarioGroups from './StateMachine.scenarios.json';

type ToggleState = { readonly variant: 'on' } | { readonly variant: 'off' };
type ToggleEvent = { readonly type: 'toggle' };

type ScenarioCase =
  | {
      description: string;
      expected: {
        stateVariant: 'on' | 'off';
      };
      input: ToggleState;
      kind: 'transitions-off-on';
      name: string;
    }
  | {
      description: string;
      expected: {
        stateVariant: 'on' | 'off';
      };
      input: ToggleState;
      kind: 'transitions-on-off';
      name: string;
    }
  | {
      description: string;
      expected: {
        errorName: string;
        eventType: string;
        stateVariant: string;
      };
      input: ToggleState;
      kind: 'wraps-reducer-throw';
      name: string;
    }
  | {
      description: string;
      expected: {
        errorName: string;
        eventType: string;
        stateVariant: string;
      };
      input: ToggleState;
      kind: 'rejected-error-surfaces';
      name: string;
    }
  | {
      description: string;
      expected: {
        errorName: string;
      };
      input: ToggleState;
      kind: 'plain-error-wraps';
      name: string;
    }
  | {
      description: string;
      expected: {
        firstTransitionStateVariant: 'on' | 'off';
        secondErrorName: string;
        secondEventType: string;
        secondStateVariant: string;
      };
      input: ToggleState;
      kind: 'terminated-blocks-transition';
      name: string;
    }
  | {
      description: string;
      expected: {
        callCount: number;
        callStateVariant: 'on' | 'off';
        callEventType: string;
      };
      input: ToggleState;
      kind: 'terminated-access-hook';
      name: string;
    };

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent> {
  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    return {
      effects: [],
      state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }
    };
  }
}

class ThrowingMachine extends StateMachine<ToggleState, ToggleEvent> {
  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(_state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw new Error('boom');
  }
}

class DeliberatelyRejectingMachine extends StateMachine<ToggleState, ToggleEvent> {
  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(state: ToggleState, event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw new TransitionRejectedError({
      eventType: event.type,
      reason: 'toggle is disabled',
      stateVariant: state.variant
    });
  }
}

class TerminatingMachine extends StateMachine<ToggleState, ToggleEvent> {
  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    return {
      effects: [],
      state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }
    };
  }

  protected override isTerminated(state: ToggleState): boolean {
    return state.variant === 'on';
  }
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => void> = {
  'plain-error-wraps': (scenarioCase) => {
    const machine = new ThrowingMachine();
    assert.throws(
      () => machine.transition(scenarioCase.input, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        assert.equal(err.constructor.name, scenarioCase.expected.errorName);
        return true;
      }
    );
  },
  'rejected-error-surfaces': (scenarioCase) => {
    const machine = new DeliberatelyRejectingMachine();
    assert.throws(
      () => machine.transition(scenarioCase.input, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof TransitionRejectedError);
        assert.ok(!(err instanceof ReducerThrewError));
        assert.equal(err.constructor.name, scenarioCase.expected.errorName);
        assert.equal((err as TransitionRejectedError).eventType, scenarioCase.expected.eventType);
        assert.equal((err as TransitionRejectedError).stateVariant, scenarioCase.expected.stateVariant);
        return true;
      }
    );
  },
  'terminated-access-hook': (scenarioCase) => {
    const calls: Array<{ event: string; state: string }> = [];

    class ObservedTerminatingMachine extends TerminatingMachine {
      protected override onTerminatedAccess(state: ToggleState, event: ToggleEvent): void {
        calls.push({ event: event.type, state: state.variant });
      }
    }

    const machine = new ObservedTerminatingMachine();
    assert.throws(() => machine.transition(scenarioCase.input, { type: 'toggle' }), MachineTerminatedError);
    assert.equal(calls.length, scenarioCase.expected.callCount);
    assert.deepEqual(calls[0], { event: scenarioCase.expected.callEventType, state: scenarioCase.expected.callStateVariant });
  },
  'terminated-blocks-transition': (scenarioCase) => {
    const machine = new TerminatingMachine();
    const onState = machine.transition(scenarioCase.input, { type: 'toggle' });
    assert.deepEqual(onState.state, { variant: scenarioCase.expected.firstTransitionStateVariant });

    assert.throws(
      () => machine.transition(onState.state, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof MachineTerminatedError);
        assert.equal(err.constructor.name, scenarioCase.expected.secondErrorName);
        assert.equal((err as MachineTerminatedError).eventType, scenarioCase.expected.secondEventType);
        assert.equal((err as MachineTerminatedError).stateVariant, scenarioCase.expected.secondStateVariant);
        return true;
      }
    );
  },
  'transitions-off-on': (scenarioCase) => {
    const machine = new ToggleMachine();
    const step = machine.transition(scenarioCase.input, { type: 'toggle' });
    assert.deepEqual(step.state, { variant: scenarioCase.expected.stateVariant });
    assert.deepEqual(step.effects, []);
  },
  'transitions-on-off': (scenarioCase) => {
    const machine = new ToggleMachine();
    const step = machine.transition(scenarioCase.input, { type: 'toggle' });
    assert.deepEqual(step.state, { variant: scenarioCase.expected.stateVariant });
    assert.deepEqual(step.effects, []);
  },
  'wraps-reducer-throw': (scenarioCase) => {
    const machine = new ThrowingMachine();
    assert.throws(
      () => machine.transition(scenarioCase.input, { type: 'toggle' }),
      (err: unknown) => {
        assert.ok(err instanceof ReducerThrewError);
        assert.equal(err.constructor.name, scenarioCase.expected.errorName);
        assert.equal((err as ReducerThrewError).eventType, 'toggle');
        assert.equal((err as ReducerThrewError).stateVariant, 'off');
        return true;
      }
    );
  }
};

void describe('StateMachine', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runnerMap[scenario.kind](scenario);
    });
  }
});
