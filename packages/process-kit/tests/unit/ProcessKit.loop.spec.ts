import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { VirtualTimeCounter } from '@studnicky/clock/node';
import {
  type EffectHandlerInterface,
  type FsmStepInterface,
  StateMachine,
  TransitionRejectedError
} from '@studnicky/fsm/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { VirtualScheduler } from '@studnicky/scheduler/node';
import assert from 'node:assert/strict';

import type { JobEffectEntity } from '../fixtures/entities/JobEffectEntity.js';
import type { JobEventEntity } from '../fixtures/entities/JobEventEntity.js';
import type { JobStateEntity } from '../fixtures/entities/JobStateEntity.js';

import { ProcessKit } from '../../src/ProcessKit.js';
import { ProcessKitScenarioCaseEntity } from './entities/ProcessKitScenarioCaseEntity.js';
import scenarioGroups from './ProcessKit.scenarios.json' with { 'type': 'json' };

class JobMachine extends StateMachine<
  JobStateEntity.Type,
  JobEventEntity.Type,
  JobEffectEntity.Type
> {
  currentState: JobStateEntity.Type = { 'variant': 'idle' };

  static make(): JobMachine {
    return new JobMachine();
  }

  getInitialState(): JobStateEntity.Type {
    return { 'variant': 'idle' };
  }

  reduce(
    state: JobStateEntity.Type,
    event: JobEventEntity.Type
  ): FsmStepInterface<JobStateEntity.Type, JobEffectEntity.Type> {
    if (state.variant === 'idle' && event.type === 'start') {
      return {
        'effects': [{ 'message': 'started', 'variant': 'log' }],
        'state': { 'variant': 'active' }
      };
    }
    if (state.variant === 'active' && event.type === 'finish') {
      return { 'effects': [], 'state': { 'variant': 'done' } };
    }
    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `no transition defined for state '${state.variant}'`,
      'stateVariant': state.variant
    });
  }

  protected override isTerminated(state: JobStateEntity.Type): boolean {
    const terminated = state.variant === 'done';
    return terminated;
  }

  protected override onEnterState(state: JobStateEntity.Type): void {
    this.currentState = state;
  }
}

class ProcessKitRunners {
  static async 'drive'(scenarioCase: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'drive'>): Promise<void> {
    const kit = ProcessKit.create<
      JobStateEntity.Type,
      JobEventEntity.Type,
      JobEffectEntity.Type
    >({
      'machine': JobMachine.make()
    });
    kit.start();
    const afterStart = await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(afterStart, scenarioCase.expected.afterStart);
    const afterFinish = await kit.dispatch(scenarioCase.input.events.finish);
    assert.deepStrictEqual(afterFinish, scenarioCase.expected.afterFinish);
    kit.stop();
  }

  static async 'effects'(scenarioCase: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'effects'>): Promise<void> {
    const logged: string[] = [];
    const handler: EffectHandlerInterface<
      JobEffectEntity.Type,
      JobEventEntity.Type
    > = (effect) => {
      logged.push(effect.message);
    };
    const kit = ProcessKit.create<
      JobStateEntity.Type,
      JobEventEntity.Type,
      JobEffectEntity.Type
    >({
      'handler': handler,
      'machine': JobMachine.make()
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(logged, scenarioCase.expected.logged);
    kit.stop();
  }

  static async 'rejection'(scenarioCase: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'rejection'>): Promise<void> {
    const kit = ProcessKit.create<
      JobStateEntity.Type,
      JobEventEntity.Type,
      JobEffectEntity.Type
    >({
      'machine': JobMachine.make()
    });
    kit.start();
    let caught: unknown;
    try {
      await kit.dispatch(scenarioCase.input.events.rejected);
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof TransitionRejectedError);
    assert.equal(
      caught.constructor.name,
      scenarioCase.expected.rejectionName
    );
    assert.equal(caught.eventType, scenarioCase.expected.rejectedEvent.type);
    const afterRecovery = await kit.dispatch(
      scenarioCase.input.events.recovery
    );
    assert.deepStrictEqual(afterRecovery, scenarioCase.expected.afterRecovery);
  }

  static async 'scheduled'(scenarioCase: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'scheduled'>): Promise<void> {
    const { counter, scheduler } = ProcessKitRunners.materializeVirtualScheduler(
      scenarioCase.input.scheduler
    );
    const machine = JobMachine.make();
    const kit = ProcessKit.create<
      JobStateEntity.Type,
      JobEventEntity.Type,
      JobEffectEntity.Type
    >({
      'machine': machine,
      'scheduler': scheduler
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(machine.currentState, { 'variant': 'active' });
    const scheduledAtMs =
      counter.nowMs() + scenarioCase.input.timing.scheduleDelayMs;
    assert.equal(scheduledAtMs, scenarioCase.expected.scheduledAtMs);
    kit.scheduleDispatch(scheduledAtMs, scenarioCase.input.events.finish);
    scheduler.advance(scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(
      machine.currentState,
      scenarioCase.expected.afterFirstAdvance
    );
    scheduler.advance(
      scenarioCase.input.timing.scheduleDelayMs -
        scenarioCase.input.timing.stepMs
    );
    assert.deepStrictEqual(
      machine.currentState,
      scenarioCase.expected.afterAdvance
    );
    kit.stop();
  }

  static async 'stop-cancels'(scenarioCase: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'stop-cancels'>): Promise<void> {
    const { counter, scheduler } = ProcessKitRunners.materializeVirtualScheduler(
      scenarioCase.input.scheduler
    );
    const machine = JobMachine.make();
    const kit = ProcessKit.create<
      JobStateEntity.Type,
      JobEventEntity.Type,
      JobEffectEntity.Type
    >({
      'machine': machine,
      'scheduler': scheduler
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    const scheduledAtMs =
      counter.nowMs() + scenarioCase.input.timing.scheduleDelayMs;
    assert.equal(scheduledAtMs, scenarioCase.expected.scheduledAtMs);
    kit.scheduleDispatch(scheduledAtMs, scenarioCase.input.events.finish);
    kit.stop();
    scheduler.advance(scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(
      machine.currentState,
      scenarioCase.expected.afterStop
    );
    scheduler.advance(
      scenarioCase.input.timing.scheduleDelayMs -
        scenarioCase.input.timing.stepMs
    );
    assert.deepStrictEqual(
      machine.currentState,
      scenarioCase.expected.afterAdvance
    );
  }

  private static materializeVirtualScheduler(
    input: ScenarioCaseOfType<ProcessKitScenarioCaseEntity.Type, 'scheduled'>['input']['scheduler']
  ) {
    const counter = VirtualTimeCounter.create(input.counter);
    const result = { 'counter': counter, 'scheduler': VirtualScheduler.create({ 'counter': counter }) };
    return result;
  }
}

ScenarioSuite.register({
  'entity': ProcessKitScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ProcessKit',
  'runners': ProcessKitRunners
});
