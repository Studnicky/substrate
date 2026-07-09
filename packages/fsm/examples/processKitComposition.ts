/** processKitComposition — hand-composes fsm's StateMachine + EffectInterpreter, scheduler's
 * VirtualScheduler, and signal's Signal into the Process Kit's documentation-only
 * reducer-with-effects recipe (no `@studnicky/process-kit` package exists; this composition
 * order IS the deliverable). A single small `JobProcess` machine models "local process as
 * explicit state plus side-effect descriptors": `reduce()` stays pure, and the `requestAck`
 * effect's handler uses the effect-handler `dispatch` capability (shipped in Phase 5) to
 * self-advance the machine with a follow-up event processed within the SAME drain cycle —
 * one flat machine, not a pyramid of chained `scheduler.schedule` calls (see the Process Kit
 * orchestration-boundary risk flags in `docs/concepts/composition-anti-patterns.md`). A
 * genuinely time-delayed transition (the `scheduleAdvance` effect) fires after the drain
 * cycle has already ended, so its scheduled callback goes through the interpreter's public
 * `send()` — `dispatch` only ever reaches events still inside the current cycle, which this
 * example demonstrates honestly rather than papering over. `VirtualScheduler` gives this
 * example a deterministic, fast-running clock; cancellation is composed via an instantiable
 * `Signal`. Run: npx tsx examples/processKitComposition.ts */

import type { ScheduledTaskType } from '@studnicky/scheduler';

// #region usage
import { VirtualTimeCounter } from '@studnicky/clock';
import { VirtualScheduler } from '@studnicky/scheduler';
import { Signal } from '@studnicky/signal';
import assert from 'node:assert/strict';

import type { FsmStepType } from '../src/index.js';

import { EffectInterpreter, MachineTerminatedError, StateMachine, TransitionRejectedError } from '../src/index.js';

// --- Domain: a job that starts, self-acknowledges in the same cycle, waits for a scheduled
// advance, then settles. Two terminal outcomes (completed, cancelled) — reduce() stays a
// pure function of (state, event) throughout. ---

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
    // Deliberate rejection (e.g. cancelling before the job ever started) — distinct from a
    // reducer defect, so callers can `instanceof`-check TransitionRejectedError.
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

class Job {
  static make(): {
    'getScheduledTask': () => ScheduledTaskType | undefined;
    'interpreter': EffectInterpreter<JobState, JobEvent, JobEffect>;
  } {
    let scheduledTask: ScheduledTaskType | undefined;
    const scheduledTaskRef = { 'current': scheduledTask };
    const interpreterRef = { 'current': null as unknown as EffectInterpreter<JobState, JobEvent, JobEffect> };

    const requestAckFn = (_effect: JobEffect, dispatch: (event: JobEvent) => void): void => {
      dispatch({ 'type': 'acknowledge' });
    };

    const scheduleAdvanceFn = (effect: JobEffect): void => {
      scheduledTaskRef.current = scheduler.scheduleAt(counter.nowMs() + (effect as Extract<JobEffect, { 'variant': 'scheduleAdvance' }>).delayMs, () => {
        scheduledTaskRef.current = undefined;
        void interpreterRef.current.send({ 'type': 'advance' });
      });
    };

    interpreterRef.current = EffectInterpreter.create<JobState, JobEvent, JobEffect>({
      'handlers': {
        'requestAck': requestAckFn,
        'scheduleAdvance': scheduleAdvanceFn
      },
      'machine': JobProcess.make()
    });

    const getScheduledTaskFn = (): ScheduledTaskType | undefined => {
      const result = scheduledTaskRef.current;
      return result;
    };

    return {
      'getScheduledTask': getScheduledTaskFn,
      'interpreter': interpreterRef.current
    };
  }
}

// Cancellation composed via the now-instantiable Signal: an AbortSignal drives a 'cancel'
// event into the interpreter and cancels any still-pending scheduled advance.
const wireCancellation = (
  interpreter: EffectInterpreter<JobState, JobEvent, JobEffect>,
  getScheduledTask: () => ScheduledTaskType | undefined,
  abortSignal: AbortSignal
): void => {
  abortSignal.addEventListener('abort', () => {
    const pending = getScheduledTask();
    if (pending !== undefined) { pending.cancel(); }
    void interpreter.send({ 'type': 'cancel' });
  }, { 'once': true });
};
// #endregion usage

// --- Scenario A: start -> same-cycle self-advance to 'acknowledged' -> scheduled advance
// fires -> completed. ---

const signalSource = Signal.create();

const jobA = Job.make();
jobA.interpreter.start();
await jobA.interpreter.send({ 'type': 'start' });
// dispatch() already carried the machine from 'waiting' to 'acknowledged' within this one
// send() call — no second send() was needed for that leg.
assert.equal(jobA.interpreter.getState().variant, 'acknowledged');

scheduler.advance(50);
assert.equal(jobA.interpreter.getState().variant, 'completed');
console.log('Job A final state:', jobA.interpreter.getState().variant);

// --- Scenario B: start -> cancelled via Signal before the scheduled advance fires; the
// pending scheduled task is cancelled too, so advancing time afterward has no effect. ---

const jobB = Job.make();
const controllerB = new AbortController();
const composedSignalB = signalSource.compose({ 'signal': controllerB.signal });
wireCancellation(jobB.interpreter, jobB.getScheduledTask, composedSignalB);

jobB.interpreter.start();
await jobB.interpreter.send({ 'type': 'start' });
assert.equal(jobB.interpreter.getState().variant, 'acknowledged');
assert.notEqual(jobB.getScheduledTask(), undefined, 'a scheduled advance must be pending while acknowledged');

controllerB.abort();
assert.equal(jobB.interpreter.getState().variant, 'cancelled');

scheduler.advance(50);
assert.equal(jobB.interpreter.getState().variant, 'cancelled', 'cancelling must also cancel the pending scheduled task');
console.log('Job B final state:', jobB.interpreter.getState().variant);

// --- Scenario C: a deliberate rejection (TransitionRejectedError) is distinguishable from
// attempting a transition on an already-terminated machine (MachineTerminatedError). ---

// A rejected transition leaves the interpreter's drain loop mid-exception, so this
// instance is used for the rejection check only, never reused afterward.
const jobRejected = Job.make();
jobRejected.interpreter.start();

let rejectedByReducer = false;
try {
  // 'cancel' has no defined transition from 'idle' — reduce() throws TransitionRejectedError.
  await jobRejected.interpreter.send({ 'type': 'cancel' });
} catch (error) {
  rejectedByReducer = error instanceof TransitionRejectedError;
}
assert.equal(rejectedByReducer, true);

// A fresh instance, driven all the way to its 'completed' terminal state, demonstrates the
// distinct MachineTerminatedError for an event sent after settlement.
const jobTerminated = Job.make();
jobTerminated.interpreter.start();
await jobTerminated.interpreter.send({ 'type': 'start' });
scheduler.advance(50);
assert.equal(jobTerminated.interpreter.getState().variant, 'completed');

let rejectedByTermination = false;
try {
  // The machine is terminated — send() surfaces MachineTerminatedError before reduce() ever
  // runs again, distinguishing "process already settled" from "reducer rejected the event".
  await jobTerminated.interpreter.send({ 'type': 'advance' });
} catch (error) {
  rejectedByTermination = error instanceof MachineTerminatedError;
}
assert.equal(rejectedByTermination, true);

console.log('processKitComposition: all assertions passed');
