import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineAdvanceEventEntity } from './entities/MachineAdvanceEventEntity.js';
import type { MachineTrafficStateEntity } from './entities/MachineTrafficStateEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ReducerThrewError } from '../../src/ReducerThrewError.js';
import { StateMachine } from '../../src/StateMachine.js';
import { StateMachineHooksScenarioCaseEntity } from './entities/StateMachineHooksScenarioCaseEntity.js';
import scenarioGroups from './StateMachineHooks.scenarios.json' with { 'type': 'json' };

class TrafficMachine extends StateMachine<
  MachineTrafficStateEntity.Type,
  MachineAdvanceEventEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineTrafficStateEntity.Type {
    return { 'variant': 'red' };
  }

  override reduce(
    state: MachineTrafficStateEntity.Type,
    _event: MachineAdvanceEventEntity.Type
  ): FsmStepInterface<MachineTrafficStateEntity.Type> {
    if (state.variant === 'red') {
      return { 'effects': [], 'state': { 'variant': 'green' } };
    }
    if (state.variant === 'green') {
      return { 'effects': [], 'state': { 'variant': 'amber' } };
    }
    return { 'effects': [], 'state': { 'variant': 'red' } };
  }
}

class ThrowingMachine extends StateMachine<
  MachineTrafficStateEntity.Type,
  MachineAdvanceEventEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineTrafficStateEntity.Type {
    return { 'variant': 'red' };
  }

  override reduce(
    _state: MachineTrafficStateEntity.Type,
    _event: MachineAdvanceEventEntity.Type
  ): FsmStepInterface<MachineTrafficStateEntity.Type> {
    throw RuntimeError.create('reducer error');
  }
}

class ObservedTrafficMachine extends TrafficMachine {
  readonly transitions: { 'event': string; 'from': string; 'to': string }[] = [];
  readonly enters: { 'variant': string }[] = [];
  readonly exits: { 'variant': string }[] = [];
  readonly rejections: { 'event': string; 'reason': string; 'state': string }[] = [];

  protected override onTransition(
    from: MachineTrafficStateEntity.Type,
    to: MachineTrafficStateEntity.Type,
    event: MachineAdvanceEventEntity.Type
  ): void {
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
  }

  protected override onEnterState(state: MachineTrafficStateEntity.Type): void {
    this.enters.push({ 'variant': state.variant });
  }

  protected override onExitState(state: MachineTrafficStateEntity.Type): void {
    this.exits.push({ 'variant': state.variant });
  }

  protected override onTransitionRejected(
    state: MachineTrafficStateEntity.Type,
    event: MachineAdvanceEventEntity.Type,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, 'reason': reason, 'state': state.variant });
  }
}

class ObservedThrowingMachine extends ThrowingMachine {
  readonly rejections: { 'event': string; 'reason': string; 'state': string }[] = [];

  protected override onTransitionRejected(
    state: MachineTrafficStateEntity.Type,
    event: MachineAdvanceEventEntity.Type,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, 'reason': reason, 'state': state.variant });
  }
}

class AsyncRejectingEnterStateMachine extends TrafficMachine {
  readonly failureDetails = { 'labels': ['initial'] };
  readonly failure = RuntimeError.create('async onEnterState boom', { 'cause': this.failureDetails });

  static make(): AsyncRejectingEnterStateMachine {
    const machine = new AsyncRejectingEnterStateMachine();
    Object.defineProperty(machine, 'onEnterState', { 'value': machine.rejectAfterTick });
    return machine;
  }

  private async rejectAfterTick(): Promise<void> {
    await Promise.resolve();
    throw this.failure;
  }
}

class OrderedMachine extends TrafficMachine {
  readonly order: ('enter' | 'exit' | 'transition')[] = [];

  protected override onExitState(_state: MachineTrafficStateEntity.Type): void {
    this.order.push('exit');
  }
  protected override onTransition(
    _from: MachineTrafficStateEntity.Type,
    _to: MachineTrafficStateEntity.Type,
    _event: MachineAdvanceEventEntity.Type
  ): void {
    this.order.push('transition');
  }
  protected override onEnterState(_state: MachineTrafficStateEntity.Type): void {
    this.order.push('enter');
  }
}

class ThrowingRejectedHookMachine extends ThrowingMachine {
  protected override onTransitionRejected(): void {
    throw RuntimeError.create('hook boom');
  }
}

class ThrowingTransitionHookMachine extends TrafficMachine {
  protected override onTransition(): void {
    throw RuntimeError.create('hook boom');
  }
}

class SelfLoopMachine extends StateMachine<
  MachineTrafficStateEntity.Type,
  MachineAdvanceEventEntity.Type
> {
  count = 0;

  public constructor() {
    super();
  }

  override getInitialState(): MachineTrafficStateEntity.Type {
    return { 'variant': 'red' };
  }
  override reduce(
    state: MachineTrafficStateEntity.Type,
    _event: MachineAdvanceEventEntity.Type
  ): FsmStepInterface<MachineTrafficStateEntity.Type> {
    return { 'effects': [], 'state': state };
  }

  protected override onTransition(): void {
    this.count += 1;
  }
  protected override onEnterState(): void {
    this.count += 1;
  }
  protected override onExitState(): void {
    this.count += 1;
  }
}

class StateMachineHooksRunners {
  static async 'async-rejection'(
    scenarioCase: ScenarioCaseOfType<StateMachineHooksScenarioCaseEntity.Type, 'async-rejection'>
  ): Promise<void> {
    let rejectionEventCount = 0;
    const onUnhandledRejection = (): void => {
      rejectionEventCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const machine = AsyncRejectingEnterStateMachine.make();
      const step = machine.transition(scenarioCase.input.state, scenarioCase.input.event);
      assert.deepEqual(step.state, { 'variant': scenarioCase.expected.state });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.equal(rejectionEventCount, scenarioCase.expected.rejectionEvents);
      assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'enter-hook'(
    scenarioCase: ScenarioCaseOfType<StateMachineHooksScenarioCaseEntity.Type, 'enter-hook'>
  ): void {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.enters.length, 1);
    assert.equal(machine.enters[0]?.variant, scenarioCase.expected.variant);
  }

  static 'exit-hook'(
    scenarioCase: ScenarioCaseOfType<StateMachineHooksScenarioCaseEntity.Type, 'exit-hook'>
  ): void {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.exits.length, 1);
    assert.equal(machine.exits[0]?.variant, scenarioCase.expected.variant);
  }

  static 'hook-order'(
    scenarioCase: ScenarioCaseOfType<StateMachineHooksScenarioCaseEntity.Type, 'hook-order'>
  ): void {
    const machine = new OrderedMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.deepEqual(machine.order, scenarioCase.expected.order);
  }

  static 'multiple-transitions'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'multiple-transitions'
    >
  ): void {
    const machine = new ObservedTrafficMachine();
    const states = scenarioCase.input.states;
    for (let index = 0; index < states.length; index += 1) {
      const state = states[index];
      assert.ok(state !== undefined);
      machine.transition(state, scenarioCase.input.event);
    }

    assert.deepEqual(machine.transitions, scenarioCase.expected.transitions);
    assert.deepEqual(machine.exits, scenarioCase.expected.exits);
    assert.deepEqual(machine.enters, scenarioCase.expected.enters);
  }

  static 'successful-transition-no-rejection'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'successful-transition-no-rejection'
    >
  ): void {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.rejections.length, scenarioCase.expected.rejectionCount);
  }

  static 'throwing-rejection-hook'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'throwing-rejection-hook'
    >
  ): void {
    const machine = new ThrowingRejectedHookMachine();
    assert.throws(() => {
      machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    }, ReducerThrewError);
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  }

  static 'throwing-transition-hook'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'throwing-transition-hook'
    >
  ): void {
    const machine = new ThrowingTransitionHookMachine();
    const step = machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.deepEqual(step.state, { 'variant': scenarioCase.expected.state });
    assert.deepEqual(step.effects, scenarioCase.expected.toEffects);
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  }

  static 'transition-hook'(
    scenarioCase: ScenarioCaseOfType<StateMachineHooksScenarioCaseEntity.Type, 'transition-hook'>
  ): void {
    const machine = new ObservedTrafficMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.transitions.length, 1);
    assert.deepEqual(machine.transitions[0], scenarioCase.expected.transition);
  }

  static 'transition-rejected-hook'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'transition-rejected-hook'
    >
  ): void {
    const machine = new ObservedThrowingMachine();
    assert.throws(() => {
      machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    }, ReducerThrewError);
    assert.equal(machine.rejections.length, 1);
    const rejection = machine.rejections[0];
    assert.ok(rejection !== undefined);
    assert.equal(rejection.state, scenarioCase.expected.state);
    assert.equal(rejection.event, scenarioCase.expected.event);
    assert.ok(rejection.reason.includes(scenarioCase.expected.reasonIncludes));
    assert.equal(machine.hookErrorCount, scenarioCase.expected.hookCount);
  }

  static 'unchanged-no-hooks'(
    scenarioCase: ScenarioCaseOfType<
      StateMachineHooksScenarioCaseEntity.Type,
      'unchanged-no-hooks'
    >
  ): void {
    const machine = new SelfLoopMachine();
    machine.transition(scenarioCase.input.state, scenarioCase.input.event);
    assert.equal(machine.count, scenarioCase.expected.hookCount);
  }
}

ScenarioSuite.register({
  'entity': StateMachineHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'StateMachine hooks',
  'runners': StateMachineHooksRunners
});
