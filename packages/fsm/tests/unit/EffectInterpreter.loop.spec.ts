import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { EffectInterpreterConstructorOptionsInterface } from '../../src/interfaces/EffectInterpreterConstructorOptionsInterface.js';
import type { FsmStepInterface } from '../../src/interfaces/FsmStepInterface.js';
import type { MachineActivateEventEntity } from './entities/MachineActivateEventEntity.js';
import type { MachineActivationEventEntity } from './entities/MachineActivationEventEntity.js';
import type { MachineCountingStateEntity } from './entities/MachineCountingStateEntity.js';
import type { MachineIdleActiveStateEntity } from './entities/MachineIdleActiveStateEntity.js';
import type { MachineLogEffectEntity } from './entities/MachineLogEffectEntity.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { EffectInterpreter } from '../../src/EffectInterpreter.js';
import { MailboxCapacityExceededError } from '../../src/errors/MailboxCapacityExceededError.js';
import { StateMachine } from '../../src/StateMachine.js';
import scenarioGroups from './EffectInterpreter.scenarios.json' with { 'type': 'json' };
import { EffectInterpreterScenarioCaseEntity } from './entities/EffectInterpreterScenarioCaseEntity.js';

class DemoMachine extends StateMachine<
  MachineIdleActiveStateEntity.Type,
  MachineActivationEventEntity.Type,
  MachineLogEffectEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineIdleActiveStateEntity.Type {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: MachineIdleActiveStateEntity.Type,
    event: MachineActivationEventEntity.Type
  ): FsmStepInterface<MachineIdleActiveStateEntity.Type, MachineLogEffectEntity.Type> {
    if (state.variant === 'idle' && event.type === 'activate') {
      return { 'effects': [{ 'message': 'activated', 'variant': 'log' }], 'state': { 'variant': 'active' } };
    }
    if (state.variant === 'active' && event.type === 'deactivate') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }
    return { 'effects': [], 'state': state };
  }
}

class RejectingMachine extends StateMachine<
  MachineIdleActiveStateEntity.Type,
  MachineActivationEventEntity.Type,
  MachineLogEffectEntity.Type
> {
  public constructor() {
    super();
  }

  override getInitialState(): MachineIdleActiveStateEntity.Type {
    return { 'variant': 'idle' };
  }
  override reduce(
    state: MachineIdleActiveStateEntity.Type,
    event: MachineActivationEventEntity.Type
  ): FsmStepInterface<MachineIdleActiveStateEntity.Type, MachineLogEffectEntity.Type> {
    if (event.type === 'deactivate') {
      throw RuntimeError.create('deliberately rejected');
    }
    if (state.variant === 'idle' && event.type === 'activate') {
      return { 'effects': [], 'state': { 'variant': 'active' } };
    }
    return { 'effects': [], 'state': state };
  }
}

class CountingMachine extends StateMachine<
  MachineCountingStateEntity.Type,
  MachineActivateEventEntity.Type
> {
  readonly #activeCount: number;
  readonly #initialCount: number;

  public constructor(initialCount: number, activeCount: number) {
    super();
    this.#initialCount = initialCount;
    this.#activeCount = activeCount;
  }

  override getInitialState(): MachineCountingStateEntity.Type {
    return { 'details': { 'count': this.#initialCount }, 'variant': 'idle' };
  }
  override reduce(
    _state: MachineCountingStateEntity.Type
  ): FsmStepInterface<MachineCountingStateEntity.Type> {
    return { 'effects': [], 'state': { 'details': { 'count': this.#activeCount }, 'variant': 'active' } };
  }
}

class RecordingStopInterpreter extends EffectInterpreter<
  MachineIdleActiveStateEntity.Type,
  MachineActivationEventEntity.Type,
  MachineLogEffectEntity.Type
> {
  readonly stoppedStates: (MachineIdleActiveStateEntity.Type | undefined)[] = [];

  public constructor(
    options: EffectInterpreterConstructorOptionsInterface<
      MachineIdleActiveStateEntity.Type,
      MachineActivationEventEntity.Type,
      MachineLogEffectEntity.Type
    >
  ) {
    super(options);
  }

  protected override onStop(state: MachineIdleActiveStateEntity.Type | undefined): void {
    this.stoppedStates.push(state);
  }
}

class ThrowingStopInterpreter extends EffectInterpreter<
  MachineIdleActiveStateEntity.Type,
  MachineActivationEventEntity.Type,
  MachineLogEffectEntity.Type
> {
  static readonly failure = RuntimeError.create('stop boom');

  protected override onStop(): void {
    throw ThrowingStopInterpreter.failure;
  }
}

class ErrorCapture {
  static async rejection(promise: Promise<unknown>): Promise<Error> {
    let captured: Error | undefined;
    try {
      await promise;
    } catch (error) {
      assert.ok(error instanceof Error);
      captured = error;
    }
    assert.ok(captured !== undefined, 'Expected promise to reject');
    return captured;
  }

  static thrown(callback: () => void): Error {
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

class EffectInterpreterRunners {
  static async 'create-default-identity'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'create-default-identity'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine());
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static 'create-empty-machine-id'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'create-empty-machine-id'
    >
  ): void {
    assert.throws(
      () => {
        EffectInterpreter.create(new DemoMachine(), { 'machineId': scenarioCase.input.machineId });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'create-non-integer-mailbox-capacity'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'create-non-integer-mailbox-capacity'
    >
  ): void {
    assert.throws(
      () => {
        EffectInterpreter.create(new DemoMachine(), {
          'machineId': scenarioCase.input.machineId,
          'mailboxCapacity': scenarioCase.input.mailboxCapacity
        });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'create-non-positive-mailbox-capacity'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'create-non-positive-mailbox-capacity'
    >
  ): void {
    assert.throws(
      () => {
        EffectInterpreter.create(new DemoMachine(), {
          'machineId': scenarioCase.input.machineId,
          'mailboxCapacity': scenarioCase.input.mailboxCapacity
        });
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static async 'effect-handler-called-after-transition'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'effect-handler-called-after-transition'
    >
  ): Promise<void> {
    const logged: string[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'handler': (effect) => {
        logged.push(effect.message);
      },
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(logged, scenarioCase.expected.logged);
  }

  static async 'effect-handler-omitted'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'effect-handler-omitted'
    >
  ): Promise<void> {
    const states: MachineIdleActiveStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.subscribe((state) => {
      states.push(state);
    });
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
    assert.equal(states.length, scenarioCase.expected.notificationCount);
    assert.deepEqual(states[1], scenarioCase.expected.state);
  }

  static 'get-state-before-start'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'get-state-before-start'
    >
  ): void {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    const error = ErrorCapture.thrown(() => {
      interpreter.getState();
    });
    assert.ok(error.message.includes('not started'));
  }

  static async 'handler-dispatches-within-send'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'handler-dispatches-within-send'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'handler': (_effect, dispatch) => {
        dispatch({ 'type': 'deactivate' });
      },
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'mailbox-capacity-bounds-mailbox'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'mailbox-capacity-bounds-mailbox'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId,
      'mailboxCapacity': scenarioCase.input.mailboxCapacity
    });
    interpreter.start();
    const sends = scenarioCase.input.events.map((event) => {
      const pending = interpreter.send(event);
      return pending;
    });
    const overflowingSend = sends[1];
    assert.ok(overflowingSend !== undefined, 'Expected a second queued send');
    const error = await ErrorCapture.rejection(overflowingSend);
    assert.ok(error instanceof MailboxCapacityExceededError);
    assert.equal(error.name, scenarioCase.expected.rejectionType);
    await sends[0];
    await sends[2];
    await sends[3];
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'processes-events-fifo'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'processes-events-fifo'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    const [firstEvent, secondEvent] = scenarioCase.input.events;
    assert.ok(firstEvent !== undefined && secondEvent !== undefined, 'Expected two queued events');
    const firstSend = interpreter.send(firstEvent);
    const secondSend = interpreter.send(secondEvent);
    await Promise.all([firstSend, secondSend]);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'queued-send-resolves-after-own-transition'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'queued-send-resolves-after-own-transition'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new RejectingMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    const rejectingSend = interpreter.send(scenarioCase.input.rejectedEvent);
    const queuedSend = interpreter.send(scenarioCase.input.recoveryEvent);
    await ErrorCapture.rejection(rejectingSend);
    await queuedSend;
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'rejected-transition-does-not-wedge'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'rejected-transition-does-not-wedge'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new RejectingMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    await ErrorCapture.rejection(interpreter.send(scenarioCase.input.rejectedEvent));
    await interpreter.send(scenarioCase.input.recoveryEvent);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'send-before-start'(
    scenarioCase: ScenarioCaseOfType<EffectInterpreterScenarioCaseEntity.Type, 'send-before-start'>
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    const error = await ErrorCapture.rejection(interpreter.send(scenarioCase.input.event));
    assert.ok(error.message.includes('not running'));
  }

  static async 'send-transitions-state'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'send-transitions-state'
    >
  ): Promise<void> {
    const states: MachineIdleActiveStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.subscribe((state) => {
      states.push(state);
    });
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
    assert.equal(states.length, scenarioCase.expected.notificationCount);
    assert.deepEqual(states[1], scenarioCase.expected.state);
  }

  static async 'snapshot-isolation'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'snapshot-isolation'
    >
  ): Promise<void> {
    const observed: MachineCountingStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(
      new CountingMachine(scenarioCase.input.initialCount, scenarioCase.input.activeCount),
      { 'machineId': scenarioCase.input.machineId }
    );
    interpreter.subscribe((state) => {
      observed.push(state);
      state.details.count = scenarioCase.input.mutatedCount;
    });
    interpreter.start();

    const initial = interpreter.getState();
    initial.details.count = scenarioCase.input.postMutationCount;
    assert.equal(interpreter.getState().details.count, scenarioCase.input.initialCount);

    await interpreter.send({ 'type': 'activate' });
    const active = interpreter.getState();
    active.details.count = scenarioCase.input.postTransitionMutationCount;

    assert.equal(interpreter.getState().details.count, scenarioCase.input.activeCount);
    assert.deepEqual(
      observed.map((state) => {
        const count = state.details.count;
        return count;
      }),
      scenarioCase.expected.observedCounts
    );
  }

  static 'start-is-idempotent'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'start-is-idempotent'
    >
  ): void {
    const states: MachineIdleActiveStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.subscribe((state) => {
      states.push(state);
    });
    interpreter.start();
    interpreter.start();
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
    assert.equal(states.length, scenarioCase.expected.notificationCount);
  }

  static 'start-sets-initial-state'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'start-sets-initial-state'
    >
  ): void {
    const states: MachineIdleActiveStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.subscribe((state) => {
      states.push(state);
    });
    interpreter.start();
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
    assert.equal(states.length, scenarioCase.expected.notificationCount);
    assert.deepEqual(states[0], scenarioCase.expected.state);
  }

  static 'stop-after-start'(
    scenarioCase: ScenarioCaseOfType<EffectInterpreterScenarioCaseEntity.Type, 'stop-after-start'>
  ): void {
    const interpreter = new RecordingStopInterpreter({
      'machine': new DemoMachine(),
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    interpreter.stop();
    assert.deepEqual(interpreter.stoppedStates, [scenarioCase.expected.state]);
  }

  static 'stop-before-start'(
    scenarioCase: ScenarioCaseOfType<EffectInterpreterScenarioCaseEntity.Type, 'stop-before-start'>
  ): void {
    const interpreter = new RecordingStopInterpreter({
      'machine': new DemoMachine(),
      'machineId': scenarioCase.input.machineId
    });
    interpreter.stop();
    assert.deepEqual(interpreter.stoppedStates, [undefined]);
  }

  static 'stop-hook-throws'(
    scenarioCase: ScenarioCaseOfType<EffectInterpreterScenarioCaseEntity.Type, 'stop-hook-throws'>
  ): void {
    const interpreter = ThrowingStopInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();
    interpreter.stop();
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
    assert.strictEqual(ThrowingStopInterpreter.failure.message, 'stop boom');
  }

  static async 'stop-while-handler-in-flight'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'stop-while-handler-in-flight'
    >
  ): Promise<void> {
    const handlerGate = Promise.withResolvers<void>();

    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'handler': async () => {
        await handlerGate.promise;
      },
      'machineId': scenarioCase.input.machineId
    });
    interpreter.start();

    const activatePromise = interpreter.send(scenarioCase.input.activateEvent);
    const deactivatePromise = interpreter.send(scenarioCase.input.deactivateEvent);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    interpreter.stop();
    handlerGate.resolve();
    await activatePromise;
    const error = await ErrorCapture.rejection(deactivatePromise);
    assert.equal(error.message.includes(scenarioCase.expected.rejectionMessage), true);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'throwing-observer-does-not-block-send'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'throwing-observer-does-not-block-send'
    >
  ): Promise<void> {
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    interpreter.subscribe(() => {
      throw RuntimeError.create('observer boom');
    });
    interpreter.start();
    await interpreter.send(scenarioCase.input.event);
    assert.deepEqual(interpreter.getState(), scenarioCase.expected.state);
  }

  static async 'unsubscribe-stops-notifications'(
    scenarioCase: ScenarioCaseOfType<
      EffectInterpreterScenarioCaseEntity.Type,
      'unsubscribe-stops-notifications'
    >
  ): Promise<void> {
    const states: MachineIdleActiveStateEntity.Type[] = [];
    const interpreter = EffectInterpreter.create(new DemoMachine(), {
      'machineId': scenarioCase.input.machineId
    });
    const unsubscribe = interpreter.subscribe((state) => {
      states.push(state);
    });
    interpreter.start();
    unsubscribe();
    await interpreter.send(scenarioCase.input.event);
    assert.equal(states.length, scenarioCase.expected.notificationCount);
  }
}

ScenarioSuite.register({
  'entity': EffectInterpreterScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'EffectInterpreter',
  'runners': EffectInterpreterRunners
});
