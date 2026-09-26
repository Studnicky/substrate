import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import { TransitionRejectedError } from '../../src/TransitionRejectedError.js';
import { MachineTerminatedError } from '../../src/MachineTerminatedError.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import { StateMachineScenarioCaseEntity } from './entities/StateMachineScenarioCaseEntity.js';
import scenarioGroups from './StateMachine.scenarios.json' with { type: 'json' };

type ToggleState = { readonly variant: 'on' | 'off' };
type ToggleEvent = { readonly type: 'toggle' };

type ScenarioCase = StateMachineScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(StateMachineScenarioCaseEntity.Schema, StateMachineScenarioCaseEntity.Node);

class ToggleMachine extends StateMachine<ToggleState, ToggleEvent> {
  public constructor() { super(); }

  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    return {
      effects: [],
      state: state.variant === 'off' ? { variant: 'on' } : { variant: 'off' }
    };
  }
}

class ThrowingMachine extends StateMachine<ToggleState, ToggleEvent> {
  public constructor() { super(); }

  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(_state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw RuntimeError.create('boom');
  }
}

class PlainErrorThrowingMachine extends StateMachine<ToggleState, ToggleEvent> {
  public constructor() { super(); }

  override getInitialState(): ToggleState { return { variant: 'off' }; }

  override reduce(_state: ToggleState, _event: ToggleEvent): FsmStepInterface<ToggleState> {
    throw 'boom-plain';
  }
}

class DeliberatelyRejectingMachine extends StateMachine<ToggleState, ToggleEvent> {
  public constructor() { super(); }

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
  public constructor() { super(); }

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

function captureThrownError(callback: () => void): Error {
  try {
    callback();
  } catch (error) {
    assert.ok(error instanceof Error);
    return error;
  }

  assert.fail('Expected callback to throw');
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => void> = {
  'plain-error-wraps': (scenarioCase) => {
    const reasons: string[] = [];
    class ObservedPlainErrorThrowingMachine extends PlainErrorThrowingMachine {
      protected override onTransitionRejected(_state: ToggleState, _event: ToggleEvent, reason: string): void {
        reasons.push(reason);
      }
    }
    const machine = new ObservedPlainErrorThrowingMachine();
    const error = captureThrownError(() => machine.transition(scenarioCase.input, { type: 'toggle' }));
    assert.ok(error instanceof ReducerThrewError);
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.cause, 'boom-plain');
    assert.deepEqual(reasons, [scenarioCase.expected.expectedReason]);
  },
  'rejected-error-surfaces': (scenarioCase) => {
    const machine = new DeliberatelyRejectingMachine();
    const error = captureThrownError(() => machine.transition(scenarioCase.input, { type: 'toggle' }));
    assert.ok(error instanceof TransitionRejectedError);
    assert.ok(!(error instanceof ReducerThrewError));
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.eventType, scenarioCase.expected.eventType);
    assert.equal(error.stateVariant, scenarioCase.expected.stateVariant);
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

    const error = captureThrownError(() => machine.transition(onState.state, { type: 'toggle' }));
    assert.ok(error instanceof MachineTerminatedError);
    assert.equal(error.constructor.name, scenarioCase.expected.secondErrorName);
    assert.equal(error.eventType, scenarioCase.expected.secondEventType);
    assert.equal(error.stateVariant, scenarioCase.expected.secondStateVariant);
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
    const error = captureThrownError(() => machine.transition(scenarioCase.input, { type: 'toggle' }));
    assert.ok(error instanceof ReducerThrewError);
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.eventType, 'toggle');
    assert.equal(error.stateVariant, 'off');
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('StateMachine', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
