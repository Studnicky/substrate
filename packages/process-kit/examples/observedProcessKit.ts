/** observedProcessKit — composes a subclassed StateMachine, a VirtualScheduler, and an
 * instantiable Signal through ProcessKit. The 'requestAck' effect uses the effect-handler
 * dispatch() capability to self-advance the machine within the SAME drain cycle (no extra
 * round trip through the caller); the 'scheduleAdvance' effect schedules a genuinely
 * time-delayed transition via ProcessKit#scheduleDispatch(), which fires well after that
 * drain cycle has ended and therefore goes through the interpreter's public send() —
 * dispatch() has no reach past the cycle that invoked the handler. Cancellation is composed
 * via the now-instantiable Signal. Run: npx tsx examples/observedProcessKit.ts */

// #region usage
import type { FsmStepType } from '@studnicky/fsm';

import { VirtualTimeCounter } from '@studnicky/clock';
import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';
import { VirtualScheduler } from '@studnicky/scheduler';
import { Signal } from '@studnicky/signal';
import assert from 'node:assert/strict';

import { ProcessKit } from '../src/index.js';

// --- Domain: a job that starts, self-acknowledges in the same cycle, waits for a scheduled
// advance, then settles. reduce() stays a pure function of (state, event) throughout. ---

type JobState =
  | { readonly 'variant': 'acknowledged' }
  | { readonly 'variant': 'cancelled' }
  | { readonly 'variant': 'completed' }
  | { readonly 'variant': 'idle' }
  | { readonly 'variant': 'waiting' };

type JobEvent =
  | { readonly 'type': 'acknowledge' }
  | { readonly 'type': 'advance' }
  | { readonly 'type': 'cancel' }
  | { readonly 'type': 'start' };

type JobEffect =
  | { readonly 'delayMs': number; readonly 'variant': 'scheduleAdvance' }
  | { readonly 'variant': 'requestAck' };

class JobProcess extends StateMachine<JobState, JobEvent, JobEffect> {
  static make(): JobProcess { return new JobProcess(); }

  getInitialState(): JobState { return { 'variant': 'idle' }; }

  reduce(state: JobState, event: JobEvent): FsmStepType<JobState, JobEffect> {
    if (state.variant === 'idle' && event.type === 'start') {
      return { 'effects': [{ 'variant': 'requestAck' }], 'state': { 'variant': 'waiting' } };
    }
    if (state.variant === 'waiting' && event.type === 'acknowledge') {
      return { 'effects': [{ 'delayMs': 50, 'variant': 'scheduleAdvance' }], 'state': { 'variant': 'acknowledged' } };
    }
    if (state.variant === 'acknowledged' && event.type === 'advance') {
      return { 'effects': [], 'state': { 'variant': 'completed' } };
    }
    if ((state.variant === 'waiting' || state.variant === 'acknowledged') && event.type === 'cancel') {
      return { 'effects': [], 'state': { 'variant': 'cancelled' } };
    }
    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `no transition defined for state '${state.variant}'`,
      'stateVariant': state.variant
    });
  }

  // Once settled, further transitions are rejected outright — reduce() is never called.
  protected override isTerminated(state: JobState): boolean {
    return state.variant === 'completed' || state.variant === 'cancelled';
  }
}

// `VirtualScheduler` gives this example a deterministic, fast clock — no real timers.
const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = VirtualScheduler.create({ 'counter': counter });

class Kit {
  static make(): ProcessKit<JobState, JobEvent, JobEffect> {
    const kitRef = { 'current': null as unknown as ProcessKit<JobState, JobEvent, JobEffect> };

    const requestAckFn = (_effect: JobEffect, dispatch: (event: JobEvent) => void): void => {
      dispatch({ 'type': 'acknowledge' });
    };

    const scheduleAdvanceFn = (effect: JobEffect): void => {
      kitRef.current.scheduleDispatch(counter.nowMs() + (effect as Extract<JobEffect, { 'variant': 'scheduleAdvance' }>).delayMs, { 'type': 'advance' });
    };

    kitRef.current = ProcessKit.create<JobState, JobEvent, JobEffect>({
      'handlers': {
        'requestAck': requestAckFn,
        'scheduleAdvance': scheduleAdvanceFn
      },
      'machine': JobProcess.make(),
      'scheduler': scheduler
    });

    return kitRef.current;
  }
}

// Cancellation composed via the now-instantiable Signal: an AbortSignal drives a 'cancel'
// event into the composed ProcessKit's public dispatch().
class CancellationWiring {
  static wireCancellation(kit: ProcessKit<JobState, JobEvent, JobEffect>, abortSignal: AbortSignal): void {
    abortSignal.addEventListener('abort', () => {
      void kit.dispatch({ 'type': 'cancel' });
    }, { 'once': true });
  }
}
// #endregion usage

// --- Scenario A: start -> same-cycle self-advance to 'acknowledged' -> scheduled advance
// fires -> completed. ---

const signalSource = Signal.create();

const kitA = Kit.make();
kitA.start();
await kitA.dispatch({ 'type': 'start' });
// dispatch() already carried the machine from 'waiting' to 'acknowledged' within this one
// send() call — no second dispatch() was needed for that leg.
assert.equal(kitA.getInterpreter().getState().variant, 'acknowledged');

scheduler.advance(50);
assert.equal(kitA.getInterpreter().getState().variant, 'completed');
console.log('Job A final state:', kitA.getInterpreter().getState().variant);
kitA.stop();

// --- Scenario B: start -> cancelled via Signal before the scheduled advance fires;
// ProcessKit#stop() cancels the pending scheduled task too, so advancing time afterward
// has no effect. ---

const kitB = Kit.make();
const controllerB = new AbortController();
const composedSignalB = signalSource.compose({ 'signal': controllerB.signal });
CancellationWiring.wireCancellation(kitB, composedSignalB);

kitB.start();
await kitB.dispatch({ 'type': 'start' });
assert.equal(kitB.getInterpreter().getState().variant, 'acknowledged');

controllerB.abort();
assert.equal(kitB.getInterpreter().getState().variant, 'cancelled');

// The scheduled advance is still pending on the shared scheduler; cancelling the machine
// does not by itself cancel it — only kit.stop() (or the task's own .cancel()) does.
// Since this kit is done, stop() tears down both the interpreter and any pending task.
kitB.stop();
scheduler.advance(50);
assert.equal(kitB.getInterpreter().getState().variant, 'cancelled', 'stop() must also cancel the pending scheduled task');
console.log('Job B final state:', kitB.getInterpreter().getState().variant);

// --- Scenario C: a deliberate rejection (TransitionRejectedError) is distinguishable from
// attempting a transition on an already-terminated machine (MachineTerminatedError). ---

const kitRejected = Kit.make();
kitRejected.start();

let rejectedByReducer = false;
try {
  // 'cancel' has no defined transition from 'idle' — reduce() throws TransitionRejectedError.
  await kitRejected.dispatch({ 'type': 'cancel' });
} catch (error) {
  rejectedByReducer = error instanceof TransitionRejectedError;
}
assert.equal(rejectedByReducer, true);
kitRejected.stop();

console.log('observedProcessKit: all assertions passed');
