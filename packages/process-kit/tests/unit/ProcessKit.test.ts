import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EffectHandlerInterface, FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';
import { VirtualTimeCounter } from '@studnicky/clock';
import { VirtualScheduler } from '@studnicky/scheduler';

import { ProcessKit } from '../../src/ProcessKit.js';
import type { JobEffectEntity } from './entities/JobEffectEntity.js';
import type { JobEventEntity } from './entities/JobEventEntity.js';
import type { JobStateEntity } from './entities/JobStateEntity.js';

class JobMachine extends StateMachine<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type> {
  currentState: JobStateEntity.Type = { 'variant': 'idle' };

  static make(): JobMachine { return new JobMachine(); }

  getInitialState(): JobStateEntity.Type { return { 'variant': 'idle' }; }

  reduce(
    state: JobStateEntity.Type,
    event: JobEventEntity.Type
  ): FsmStepInterface<JobStateEntity.Type, JobEffectEntity.Type> {
    if (state.variant === 'idle' && event.type === 'start') {
      return { 'effects': [{ 'message': 'started', 'variant': 'log' }], 'state': { 'variant': 'active' } };
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
    return state.variant === 'done';
  }

  protected override onEnterState(state: JobStateEntity.Type): void {
    this.currentState = state;
  }
}

describe('ProcessKit', () => {
  it('start()/dispatch()/stop() drive a small idle -> active -> done machine', async () => {
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({ 'machine': JobMachine.make() });

    kit.start();
    const afterStart = await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(afterStart, { 'variant': 'active' });

    const afterFinish = await kit.dispatch({ 'type': 'finish' });
    assert.deepEqual(afterFinish, { 'variant': 'done' });

    kit.stop();
  });

  it('effect handlers observe effects returned alongside a transition', async () => {
    const logged: string[] = [];
    const handler: EffectHandlerInterface<JobEffectEntity.Type, JobEventEntity.Type> = (effect) => {
      logged.push(effect.message);
    };

    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({ 'handler': handler, 'machine': JobMachine.make() });
    kit.start();
    await kit.dispatch({ 'type': 'start' });

    assert.deepEqual(logged, ['started']);
    kit.stop();
  });

  it('scheduleDispatch() advances state at the right virtual time via the public send() path', async () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 0 });
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const machine = JobMachine.make();
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({ 'machine': machine, 'scheduler': scheduler });
    kit.start();
    await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(machine.currentState, { 'variant': 'active' });

    kit.scheduleDispatch(counter.nowMs() + 100, { 'type': 'finish' });

    // Before the scheduled time arrives, state is unchanged.
    scheduler.advance(50);
    assert.deepEqual(machine.currentState, { 'variant': 'active' });

    // At/after the scheduled time, the scheduled callback drives the interpreter's public
    // send() — the effect-handler dispatch() capability has no reach here since this fires
    // well outside the drain cycle that scheduled it.
    scheduler.advance(50);
    assert.deepEqual(machine.currentState, { 'variant': 'done' });

    kit.stop();
  });

  it('stop() cancels every task tracked by the composed scheduler', async () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 0 });
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const machine = JobMachine.make();
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({ 'machine': machine, 'scheduler': scheduler });
    kit.start();
    await kit.dispatch({ 'type': 'start' });

    kit.scheduleDispatch(counter.nowMs() + 100, { 'type': 'finish' });
    kit.stop();

    scheduler.advance(200);
    // The scheduled 'finish' dispatch was cancelled by stop() — state stays 'active', and the
    // interpreter is stopped besides.
    assert.deepEqual(machine.currentState, { 'variant': 'active' });
  });

  it('a rejected transition surfaces TransitionRejectedError and does not wedge the interpreter', async () => {
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({ 'machine': JobMachine.make() });
    kit.start();

    let rejected = false;
    try {
      // 'finish' has no defined transition from 'idle' — reduce() throws TransitionRejectedError.
      await kit.dispatch({ 'type': 'finish' });
    } catch (error) {
      rejected = error instanceof TransitionRejectedError;
    }
    assert.equal(rejected, true);

    // A rejected entry releases the interpreter drain loop so this dispatch still transitions.
    const afterRecovery = await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(afterRecovery, { 'variant': 'active' });
  });

});
