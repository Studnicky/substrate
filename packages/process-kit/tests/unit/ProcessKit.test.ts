import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EffectHandlerMapType, FsmStepType } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';
import { VirtualTimeCounter } from '@studnicky/clock';
import { VirtualScheduler } from '@studnicky/scheduler';
import { Signal } from '@studnicky/signal';

import { ProcessKit } from '../../src/ProcessKit.js';

type JobState =
  | { readonly 'variant': 'active' }
  | { readonly 'variant': 'done' }
  | { readonly 'variant': 'idle' };

type JobEvent =
  | { readonly 'type': 'finish' }
  | { readonly 'type': 'reject' }
  | { readonly 'type': 'start' };

type JobEffect = { readonly 'variant': 'log'; readonly 'message': string };

class JobMachine extends StateMachine<JobState, JobEvent, JobEffect> {
  static make(): JobMachine { return new JobMachine(); }

  getInitialState(): JobState { return { 'variant': 'idle' }; }

  reduce(state: JobState, event: JobEvent): FsmStepType<JobState, JobEffect> {
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

  protected override isTerminated(state: JobState): boolean {
    return state.variant === 'done';
  }
}

describe('ProcessKit', () => {
  it('start()/dispatch()/stop() drive a small idle -> active -> done machine', async () => {
    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'machine': JobMachine.make() });

    kit.start();
    const afterStart = await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(afterStart, { 'variant': 'active' });

    const afterFinish = await kit.dispatch({ 'type': 'finish' });
    assert.deepEqual(afterFinish, { 'variant': 'done' });

    kit.stop();
  });

  it('effect handlers observe effects returned alongside a transition', async () => {
    const logged: string[] = [];
    const handlers: EffectHandlerMapType<JobEffect, JobEvent> = {
      'log': (effect) => { logged.push(effect.message); }
    };

    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'handlers': handlers, 'machine': JobMachine.make() });
    kit.start();
    await kit.dispatch({ 'type': 'start' });

    assert.deepEqual(logged, ['started']);
    kit.stop();
  });

  it('scheduleDispatch() advances state at the right virtual time via the public send() path', async () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 0 });
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'machine': JobMachine.make(), 'scheduler': scheduler });
    kit.start();
    await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(kit.getInterpreter().getState(), { 'variant': 'active' });

    kit.scheduleDispatch(counter.nowMs() + 100, { 'type': 'finish' });

    // Before the scheduled time arrives, state is unchanged.
    scheduler.advance(50);
    assert.deepEqual(kit.getInterpreter().getState(), { 'variant': 'active' });

    // At/after the scheduled time, the scheduled callback drives the interpreter's public
    // send() — the effect-handler dispatch() capability has no reach here since this fires
    // well outside the drain cycle that scheduled it.
    scheduler.advance(50);
    assert.deepEqual(kit.getInterpreter().getState(), { 'variant': 'done' });

    kit.stop();
  });

  it('stop() cancels every task tracked by the composed scheduler', async () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 0 });
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'machine': JobMachine.make(), 'scheduler': scheduler });
    kit.start();
    await kit.dispatch({ 'type': 'start' });

    kit.scheduleDispatch(counter.nowMs() + 100, { 'type': 'finish' });
    kit.stop();

    scheduler.advance(200);
    // The scheduled 'finish' dispatch was cancelled by stop() — state stays 'active', and the
    // interpreter is stopped besides.
    assert.deepEqual(kit.getInterpreter().getState(), { 'variant': 'active' });
  });

  it('a rejected transition surfaces TransitionRejectedError and does not wedge the interpreter', async () => {
    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'machine': JobMachine.make() });
    kit.start();

    let rejected = false;
    try {
      // 'finish' has no defined transition from 'idle' — reduce() throws TransitionRejectedError.
      await kit.dispatch({ 'type': 'finish' });
    } catch (error) {
      rejected = error instanceof TransitionRejectedError;
    }
    assert.equal(rejected, true);

    // Before the EffectInterpreter#drain() try/finally fix, #draining stayed stuck true after
    // a rejection, so this dispatch() would silently no-op. It must still drive the machine.
    const afterRecovery = await kit.dispatch({ 'type': 'start' });
    assert.deepEqual(afterRecovery, { 'variant': 'active' });
  });

  it('getters return the exact composed instances', () => {
    const machine = JobMachine.make();
    const scheduler = VirtualScheduler.create({ 'counter': VirtualTimeCounter.create({ 'startMs': 0 }) });
    const signal = Signal.create();

    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({
      'machine': machine,
      'scheduler': scheduler,
      'signal': signal
    });

    assert.equal(kit.getMachine(), machine);
    assert.equal(kit.getScheduler(), scheduler);
    assert.equal(kit.getSignal(), signal);
    assert.equal(typeof kit.getInterpreter().start, 'function');
  });

  it('create() defaults scheduler to a RealTimeScheduler and signal to Signal.create() when omitted', () => {
    const kit = ProcessKit.create<JobState, JobEvent, JobEffect>({ 'machine': JobMachine.make() });

    assert.equal(typeof kit.getScheduler().scheduleAt, 'function');
    assert.ok(kit.getSignal() instanceof Signal);
  });
});
