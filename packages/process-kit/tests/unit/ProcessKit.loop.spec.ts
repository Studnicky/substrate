import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualTimeCounter } from '@studnicky/clock';
import { StateMachine, TransitionRejectedError, type EffectHandlerInterface, type FsmStepInterface } from '@studnicky/fsm';
import { VirtualScheduler } from '@studnicky/scheduler';

import { ProcessKit } from '../../src/ProcessKit.js';
import type { JobEffectEntity } from '../fixtures/entities/JobEffectEntity.js';
import type { JobEventEntity } from '../fixtures/entities/JobEventEntity.js';
import type { JobStateEntity } from '../fixtures/entities/JobStateEntity.js';
import scenarioGroups from './ProcessKit.scenarios.json';

interface ScenarioCaseBaseInterface {
  description: string;
  name: string;
}

interface ScheduledScenarioInputInterface {
  events: { finish: JobEventEntity.Type; start: JobEventEntity.Type };
  scheduler: {
    counter: { startMs: number };
  };
  timing: {
    scheduleDelayMs: number;
    stepMs: number;
  };
}

type ScenarioCase =
  | (ScenarioCaseBaseInterface & {
      expected: { afterFinish: JobStateEntity.Type; afterStart: JobStateEntity.Type };
      input: {
        events: { finish: JobEventEntity.Type; start: JobEventEntity.Type };
      };
      shape: 'drive';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { logged: string[] };
      input: {
        events: { start: JobEventEntity.Type };
      };
      shape: 'effects';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { afterAdvance: JobStateEntity.Type; afterFirstAdvance: JobStateEntity.Type; afterStart: JobStateEntity.Type; scheduledAtMs: number };
      input: ScheduledScenarioInputInterface;
      shape: 'scheduled';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { afterAdvance: JobStateEntity.Type; afterStop: JobStateEntity.Type; scheduledAtMs: number };
      input: ScheduledScenarioInputInterface;
      shape: 'stop-cancels';
    })
  | (ScenarioCaseBaseInterface & {
      expected: { afterRecovery: JobStateEntity.Type; rejectionName: string; rejectedEvent: JobEventEntity.Type };
      input: {
        events: { rejected: JobEventEntity.Type; recovery: JobEventEntity.Type };
      };
      shape: 'rejection';
    });

class JobMachine extends StateMachine<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type> {
  currentState: JobStateEntity.Type = { variant: 'idle' };

  static make(): JobMachine { return new JobMachine(); }

  getInitialState(): JobStateEntity.Type { return { variant: 'idle' }; }

  reduce(
    state: JobStateEntity.Type,
    event: JobEventEntity.Type
  ): FsmStepInterface<JobStateEntity.Type, JobEffectEntity.Type> {
    if (state.variant === 'idle' && event.type === 'start') {
      return { effects: [{ message: 'started', variant: 'log' }], state: { variant: 'active' } };
    }
    if (state.variant === 'active' && event.type === 'finish') {
      return { effects: [], state: { variant: 'done' } };
    }
    throw new TransitionRejectedError({
      eventType: event.type,
      reason: `no transition defined for state '${state.variant}'`,
      stateVariant: state.variant
    });
  }

  protected override isTerminated(state: JobStateEntity.Type): boolean {
    return state.variant === 'done';
  }

  protected override onEnterState(state: JobStateEntity.Type): void {
    this.currentState = state;
  }
}

function materializeVirtualScheduler(input: ScheduledScenarioInputInterface['scheduler']) {
  const counter = VirtualTimeCounter.create(input.counter);
  return { counter, scheduler: VirtualScheduler.create({ counter }) };
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  drive: async (scenarioCase) => {
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      machine: JobMachine.make()
    });
    kit.start();
    const afterStart = await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(afterStart, scenarioCase.expected.afterStart);
    const afterFinish = await kit.dispatch(scenarioCase.input.events.finish);
    assert.deepStrictEqual(afterFinish, scenarioCase.expected.afterFinish);
    kit.stop();
  },

  effects: async (scenarioCase) => {
    const logged: string[] = [];
    const handler: EffectHandlerInterface<JobEffectEntity.Type, JobEventEntity.Type> = (effect) => {
      logged.push(effect.message);
    };
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      handler,
      machine: JobMachine.make()
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(logged, scenarioCase.expected.logged);
    kit.stop();
  },

  scheduled: async (scenarioCase) => {
    const { counter, scheduler } = materializeVirtualScheduler(scenarioCase.input.scheduler);
    const machine = JobMachine.make();
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      machine,
      scheduler
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    assert.deepStrictEqual(machine.currentState, { variant: 'active' });
    const scheduledAtMs = counter.nowMs() + scenarioCase.input.timing.scheduleDelayMs;
    assert.equal(scheduledAtMs, scenarioCase.expected.scheduledAtMs);
    kit.scheduleDispatch(scheduledAtMs, scenarioCase.input.events.finish);
    scheduler.advance(scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(machine.currentState, scenarioCase.expected.afterFirstAdvance);
    scheduler.advance(scenarioCase.input.timing.scheduleDelayMs - scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(machine.currentState, scenarioCase.expected.afterAdvance);
    kit.stop();
  },

  'stop-cancels': async (scenarioCase) => {
    const { counter, scheduler } = materializeVirtualScheduler(scenarioCase.input.scheduler);
    const machine = JobMachine.make();
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      machine,
      scheduler
    });
    kit.start();
    await kit.dispatch(scenarioCase.input.events.start);
    const scheduledAtMs = counter.nowMs() + scenarioCase.input.timing.scheduleDelayMs;
    assert.equal(scheduledAtMs, scenarioCase.expected.scheduledAtMs);
    kit.scheduleDispatch(scheduledAtMs, scenarioCase.input.events.finish);
    kit.stop();
    scheduler.advance(scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(machine.currentState, scenarioCase.expected.afterStop);
    scheduler.advance(scenarioCase.input.timing.scheduleDelayMs - scenarioCase.input.timing.stepMs);
    assert.deepStrictEqual(machine.currentState, scenarioCase.expected.afterAdvance);
  },

  rejection: async (scenarioCase) => {
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      machine: JobMachine.make()
    });
    kit.start();
    await assert.rejects(() => kit.dispatch(scenarioCase.input.events.rejected), (error: unknown) => {
      assert.ok(error instanceof TransitionRejectedError);
      assert.equal(error.eventType, scenarioCase.expected.rejectedEvent.type);
      return true;
    });
    const afterRecovery = await kit.dispatch(scenarioCase.input.events.recovery);
    assert.deepStrictEqual(afterRecovery, scenarioCase.expected.afterRecovery);
    assert.equal(scenarioCase.expected.rejectionName, 'TransitionRejectedError');
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('ProcessKit', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
