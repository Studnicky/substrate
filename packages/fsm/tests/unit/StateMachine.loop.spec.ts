import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineOnOffStateEntity } from './entities/MachineOnOffStateEntity.js';
import type { MachineToggleEventEntity } from './entities/MachineToggleEventEntity.js';

import { MachineTerminatedError } from '../../src/MachineTerminatedError.js';
import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import { TransitionRejectedError } from '../../src/TransitionRejectedError.js';
import { StateMachineScenarioCaseEntity } from './entities/StateMachineScenarioCaseEntity.js';
import scenarioGroups from './StateMachine.scenarios.json' with { 'type': 'json' };

class ToggleMachine extends StateMachine<MachineOnOffStateEntity.Type, MachineToggleEventEntity.Type> {
  public constructor() { super(); }

  override getInitialState(): MachineOnOffStateEntity.Type { return { 'variant': 'off' }; }

  override reduce(state: MachineOnOffStateEntity.Type, _event: MachineToggleEventEntity.Type): FsmStepInterface<MachineOnOffStateEntity.Type> {
    return {
      'effects': [],
      'state': state.variant === 'off' ? { 'variant': 'on' } : { 'variant': 'off' }
    };
  }
}

class ThrowingMachine extends StateMachine<MachineOnOffStateEntity.Type, MachineToggleEventEntity.Type> {
  public constructor() { super(); }

  override getInitialState(): MachineOnOffStateEntity.Type { return { 'variant': 'off' }; }

  override reduce(_state: MachineOnOffStateEntity.Type, _event: MachineToggleEventEntity.Type): FsmStepInterface<MachineOnOffStateEntity.Type> {
    throw RuntimeError.create('boom');
  }
}

class PlainErrorThrowingMachine extends StateMachine<MachineOnOffStateEntity.Type, MachineToggleEventEntity.Type> {
  public constructor() { super(); }

  override getInitialState(): MachineOnOffStateEntity.Type { return { 'variant': 'off' }; }

  private static *plainSource(): Generator<number> {
    yield 1;
  }

  override reduce(state: MachineOnOffStateEntity.Type, _event: MachineToggleEventEntity.Type): FsmStepInterface<MachineOnOffStateEntity.Type> {
    const source = PlainErrorThrowingMachine.plainSource();
    source.next();
    source.throw('boom-plain');
    const step = { 'effects': [], 'state': state };
    return step;
  }
}

class DeliberatelyRejectingMachine extends StateMachine<MachineOnOffStateEntity.Type, MachineToggleEventEntity.Type> {
  public constructor() { super(); }

  override getInitialState(): MachineOnOffStateEntity.Type { return { 'variant': 'off' }; }

  override reduce(state: MachineOnOffStateEntity.Type, event: MachineToggleEventEntity.Type): FsmStepInterface<MachineOnOffStateEntity.Type> {
    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': 'toggle is disabled',
      'stateVariant': state.variant
    });
  }
}

class TerminatingMachine extends StateMachine<MachineOnOffStateEntity.Type, MachineToggleEventEntity.Type> {
  public constructor() { super(); }

  override getInitialState(): MachineOnOffStateEntity.Type { return { 'variant': 'off' }; }

  override reduce(state: MachineOnOffStateEntity.Type, _event: MachineToggleEventEntity.Type): FsmStepInterface<MachineOnOffStateEntity.Type> {
    return {
      'effects': [],
      'state': state.variant === 'off' ? { 'variant': 'on' } : { 'variant': 'off' }
    };
  }

  protected override isTerminated(state: MachineOnOffStateEntity.Type): boolean {
    const terminated = state.variant === 'on';
    return terminated;
  }
}


class ObservedPlainErrorThrowingMachine extends PlainErrorThrowingMachine {
  readonly reasons: string[] = [];

  protected override onTransitionRejected(_state: MachineOnOffStateEntity.Type, _event: MachineToggleEventEntity.Type, reason: string): void {
    this.reasons.push(reason);
  }
}

class ObservedTerminatingMachine extends TerminatingMachine {
  readonly calls: { 'event': string; 'state': string }[] = [];

  protected override onTerminatedAccess(state: MachineOnOffStateEntity.Type, event: MachineToggleEventEntity.Type): void {
    this.calls.push({ 'event': event.type, 'state': state.variant });
  }
}

class StateMachineRunners {
  static 'plain-error-wraps'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'plain-error-wraps'>): void {
    const machine = new ObservedPlainErrorThrowingMachine();
    const error = StateMachineRunners.captureThrownError(() => {
      machine.transition(scenarioCase.input, { 'type': 'toggle' });
    });
    assert.ok(error instanceof ReducerThrewError);
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.cause, 'boom-plain');
    assert.deepEqual(machine.reasons, [scenarioCase.expected.expectedReason]);
  }

  static 'rejected-error-surfaces'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'rejected-error-surfaces'>): void {
    const machine = new DeliberatelyRejectingMachine();
    const error = StateMachineRunners.captureThrownError(() => {
      machine.transition(scenarioCase.input, { 'type': 'toggle' });
    });
    assert.ok(error instanceof TransitionRejectedError);
    assert.ok(!(error instanceof ReducerThrewError));
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.eventType, scenarioCase.expected.eventType);
    assert.equal(error.stateVariant, scenarioCase.expected.stateVariant);
  }

  static 'terminated-access-hook'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'terminated-access-hook'>): void {
    const machine = new ObservedTerminatingMachine();
    assert.throws(() => {
      machine.transition(scenarioCase.input, { 'type': 'toggle' });
    }, MachineTerminatedError);
    assert.equal(machine.calls.length, scenarioCase.expected.callCount);
    assert.deepEqual(machine.calls[0], { 'event': scenarioCase.expected.callEventType, 'state': scenarioCase.expected.callStateVariant });
  }

  static 'terminated-blocks-transition'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'terminated-blocks-transition'>): void {
    const machine = new TerminatingMachine();
    const onState = machine.transition(scenarioCase.input, { 'type': 'toggle' });
    assert.deepEqual(onState.state, { 'variant': scenarioCase.expected.firstTransitionStateVariant });

    const error = StateMachineRunners.captureThrownError(() => {
      machine.transition(onState.state, { 'type': 'toggle' });
    });
    assert.ok(error instanceof MachineTerminatedError);
    assert.equal(error.constructor.name, scenarioCase.expected.secondErrorName);
    assert.equal(error.eventType, scenarioCase.expected.secondEventType);
    assert.equal(error.stateVariant, scenarioCase.expected.secondStateVariant);
  }

  static 'transitions-off-on'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'transitions-off-on'>): void {
    const machine = new ToggleMachine();
    const step = machine.transition(scenarioCase.input, { 'type': 'toggle' });
    assert.deepEqual(step.state, { 'variant': scenarioCase.expected.stateVariant });
    assert.deepEqual(step.effects, []);
  }

  static 'transitions-on-off'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'transitions-on-off'>): void {
    const machine = new ToggleMachine();
    const step = machine.transition(scenarioCase.input, { 'type': 'toggle' });
    assert.deepEqual(step.state, { 'variant': scenarioCase.expected.stateVariant });
    assert.deepEqual(step.effects, []);
  }

  static 'wraps-reducer-throw'(scenarioCase: ScenarioCaseOfType<StateMachineScenarioCaseEntity.Type, 'wraps-reducer-throw'>): void {
    const machine = new ThrowingMachine();
    const error = StateMachineRunners.captureThrownError(() => {
      machine.transition(scenarioCase.input, { 'type': 'toggle' });
    });
    assert.ok(error instanceof ReducerThrewError);
    assert.equal(error.constructor.name, scenarioCase.expected.errorName);
    assert.equal(error.eventType, 'toggle');
    assert.equal(error.stateVariant, 'off');
  }

  private static captureThrownError(callback: () => void): Error {
    let captured: Error | undefined;
    try {
      callback();
    } catch (error) {
      assert.ok(error instanceof Error);
      captured = error;
    }
    assert.ok(captured !== undefined, 'Expected callback to throw');
    return captured;
  }
}

ScenarioSuite.register({
  'entity': StateMachineScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'StateMachine',
  'runners': StateMachineRunners
});
