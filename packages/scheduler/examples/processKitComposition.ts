import type { EffectHandlerInterface, FsmStepInterface } from '@studnicky/fsm';
/** processKitComposition — directly composes fsm's StateMachine + EffectInterpreter,
 * scheduler's VirtualScheduler, and signal's Signal into a reducer-with-effects process.
 * The `requestAck` effect uses the handler's same-cycle `dispatch` capability, while the
 * delayed `scheduleAdvance` effect uses the interpreter's public `send()` path after its
 * drain cycle ends. Virtual time keeps scheduling deterministic, and Signal supplies the
 * cancellation boundary. Run: npx tsx examples/processKitComposition.ts */

import { VirtualTimeCounter } from '@studnicky/clock';
import { RuntimeError } from '@studnicky/errors';
// #region usage
import { EffectInterpreter, MachineTerminatedError, StateMachine, TransitionRejectedError } from '@studnicky/fsm';
import { Signal } from '@studnicky/signal';
import assert from 'node:assert/strict';

import type { ScheduledTaskInterface } from '../src/interfaces/index.js';
import type { JobEffectEntity } from './entities/JobEffectEntity.js';
import type { JobEventEntity } from './entities/JobEventEntity.js';
import type { JobStateEntity } from './entities/JobStateEntity.js';

import { VirtualScheduler } from '../src/index.js';

// --- Domain: a job that starts, self-acknowledges in the same cycle, waits for a scheduled
// advance, then settles. Two terminal outcomes (completed, cancelled) — reduce() stays a
// pure function of (state, event) throughout. ---

class JobProcess extends StateMachine<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type> {
  static make(): JobProcess { return new JobProcess(); }

  getInitialState(): JobStateEntity.Type { return { 'variant': 'idle' }; }

  reduce(
    state: JobStateEntity.Type,
    event: JobEventEntity.Type
  ): FsmStepInterface<JobStateEntity.Type, JobEffectEntity.Type> {
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
  protected override isTerminated(state: JobStateEntity.Type): boolean {
    const result = state.variant === 'completed' || state.variant === 'cancelled';
    return result;
  }
}

// `VirtualScheduler` gives this example a deterministic, fast clock — no real timers.
const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = VirtualScheduler.create({ 'counter': counter });

class Job {
  static make(): {
    'interpreter': EffectInterpreter<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>;
    'scheduledTaskReference': { 'current': ScheduledTaskInterface | undefined };
    'waitForScheduledDispatch': () => Promise<void>;
  } {
    const scheduledTaskReference: { 'current': ScheduledTaskInterface | undefined } = { 'current': undefined };
    const scheduledDispatchReference: { 'current': Promise<void> | undefined } = { 'current': undefined };
    const handler: EffectHandlerInterface<JobEffectEntity.Type, JobEventEntity.Type> = (effect, dispatch) => {
      if (effect.variant === 'requestAck') {
        dispatch({ 'type': 'acknowledge' });
        return;
      }
      scheduledTaskReference.current = scheduler.scheduleAt(counter.nowMs() + effect.delayMs, () => {
        scheduledTaskReference.current = undefined;
        const scheduledDispatch = interpreter.send({ 'type': 'advance' });
        scheduledDispatchReference.current = scheduledDispatch;
        return scheduledDispatch;
      });
    };

    const interpreter = EffectInterpreter.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      'handler': handler,
      'machine': JobProcess.make()
    });

    const waitForScheduledDispatch = (): Promise<void> => {
      const scheduledDispatch = scheduledDispatchReference.current;
      if (scheduledDispatch === undefined) {
        throw RuntimeError.create('Scheduled dispatch has not started');
      }
      return scheduledDispatch;
    };

    return {
      'interpreter': interpreter,
      'scheduledTaskReference': scheduledTaskReference,
      'waitForScheduledDispatch': waitForScheduledDispatch
    };
  }
}

// Cancellation composed via Signal: an AbortSignal drives a 'cancel'
// event into the interpreter and cancels any still-pending scheduled advance.
class CancellationWiring {
  static wire(
    interpreter: EffectInterpreter<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>,
    scheduledTaskReference: { 'current': ScheduledTaskInterface | undefined },
    abortSignal: AbortSignal
  ): Promise<void> {
    const result = new Promise<void>((resolve, reject) => {
      abortSignal.addEventListener('abort', () => {
        const pending = scheduledTaskReference.current;
        if (pending !== undefined) { pending.cancel(); }
        interpreter.send({ 'type': 'cancel' }).then(resolve, reject);
      }, { 'once': true });
    });
    return result;
  }
}
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
await jobA.waitForScheduledDispatch();
assert.equal(jobA.interpreter.getState().variant, 'completed');
console.log('Job A final state:', jobA.interpreter.getState().variant);

// --- Scenario B: start -> cancelled via Signal before the scheduled advance fires; the
// pending scheduled task is cancelled too, so advancing time afterward has no effect. ---

const jobB = Job.make();
const controllerB = new AbortController();
const composedSignalB = await signalSource.compose({ 'signal': controllerB.signal });
const cancellationB = CancellationWiring.wire(jobB.interpreter, jobB.scheduledTaskReference, composedSignalB);

jobB.interpreter.start();
await jobB.interpreter.send({ 'type': 'start' });
assert.equal(jobB.interpreter.getState().variant, 'acknowledged');
assert.notEqual(jobB.scheduledTaskReference.current, undefined, 'a scheduled advance must be pending while acknowledged');

controllerB.abort();
await cancellationB;
assert.equal(jobB.interpreter.getState().variant, 'cancelled');

scheduler.advance(50);
assert.equal(jobB.interpreter.getState().variant, 'cancelled', 'cancelling must also cancel the pending scheduled task');
console.log('Job B final state:', jobB.interpreter.getState().variant);

// --- Scenario C: a deliberate rejection (TransitionRejectedError) is distinguishable from
// attempting a transition on an already-terminated machine (MachineTerminatedError). ---

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
await jobTerminated.waitForScheduledDispatch();
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
