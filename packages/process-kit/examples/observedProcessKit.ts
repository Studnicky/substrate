/** observedProcessKit — composes a subclassed StateMachine, a VirtualScheduler, and an
 * instantiable Signal through ProcessKit. The 'requestAck' effect uses the effect-handler
 * dispatch() capability to self-advance the machine within the SAME drain cycle (no extra
 * round trip through the caller); the 'scheduleAdvance' effect schedules a genuinely
 * time-delayed transition via ProcessKit#scheduleDispatch(), which fires well after that
 * drain cycle has ended and therefore goes through the interpreter's public send() —
 * dispatch() has no reach past the cycle that invoked the handler. Cancellation is composed
 * through Signal. Run: npx tsx examples/observedProcessKit.ts */

// #region usage
import type { EffectHandlerInterface, FsmStepInterface } from '@studnicky/fsm';

import { VirtualTimeCounter } from '@studnicky/clock';
import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';
import { VirtualScheduler } from '@studnicky/scheduler';
import { Signal } from '@studnicky/signal';
import assert from 'node:assert/strict';

import type { JobEffectEntity } from './entities/JobEffectEntity.js';
import type { JobEventEntity } from './entities/JobEventEntity.js';
import type { JobStateEntity } from './entities/JobStateEntity.js';

import { ProcessKit } from '../src/index.js';

// --- Domain: a job that starts, self-acknowledges in the same cycle, waits for a scheduled
// advance, then settles. reduce() stays a pure function of (state, event) throughout. ---

class JobProcess extends StateMachine<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type> {
  readonly #stateWaiters = new Map<JobStateEntity.Type['variant'], Set<() => void>>();
  currentState: JobStateEntity.Type = { 'variant': 'idle' };

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
    throw new TransitionRejectedError({
      'eventType': event.type,
      'reason': `no transition defined for state '${state.variant}'`,
      'stateVariant': state.variant
    });
  }

  waitForState(variant: JobStateEntity.Type['variant']): Promise<void> {
    if (this.currentState.variant === variant) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const waiters = this.#stateWaiters.get(variant) ?? new Set<() => void>();
      waiters.add(resolve);
      this.#stateWaiters.set(variant, waiters);
    });
  }

  // Once settled, further transitions are rejected outright — reduce() is never called.
  protected override isTerminated(state: JobStateEntity.Type): boolean {
    return state.variant === 'completed' || state.variant === 'cancelled';
  }

  protected override onEnterState(state: JobStateEntity.Type): void {
    this.currentState = state;
    const waiters = this.#stateWaiters.get(state.variant);
    if (waiters === undefined) {
      return;
    }
    this.#stateWaiters.delete(state.variant);
    for (const resolve of waiters) {
      resolve();
    }
  }
}

// `VirtualScheduler` gives this example a deterministic, fast clock — no real timers.
const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = VirtualScheduler.create({ 'counter': counter });

class Kit {
  static make(): {
    readonly 'kit': ProcessKit<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>;
    readonly 'machine': JobProcess;
  } {
    const handler: EffectHandlerInterface<JobEffectEntity.Type, JobEventEntity.Type> = (effect, dispatch) => {
      if (effect.variant === 'requestAck') {
        dispatch({ 'type': 'acknowledge' });
        return;
      }
      kit.scheduleDispatch(counter.nowMs() + effect.delayMs, { 'type': 'advance' });
    };

    const machine = JobProcess.make();
    const kit = ProcessKit.create<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>({
      'handler': handler,
      'machine': machine,
      'scheduler': scheduler
    });

    return { 'kit': kit, 'machine': machine };
  }
}

// Cancellation composed via Signal: an AbortSignal drives a 'cancel'
// event into the composed ProcessKit's public dispatch().
class CancellationWiring {
  static wireCancellation(
    kit: ProcessKit<JobStateEntity.Type, JobEventEntity.Type, JobEffectEntity.Type>,
    abortSignal: AbortSignal
  ): Promise<JobStateEntity.Type> {
    return new Promise<JobStateEntity.Type>((resolve, reject) => {
      abortSignal.addEventListener('abort', () => {
        kit.dispatch({ 'type': 'cancel' }).then(resolve, reject);
      }, { 'once': true });
    });
  }
}
// #endregion usage

// --- Scenario A: start -> same-cycle self-advance to 'acknowledged' -> scheduled advance
// fires -> completed. ---

const signalSource = Signal.create();

const processA = Kit.make();
const kitA = processA.kit;
kitA.start();
await kitA.dispatch({ 'type': 'start' });
// dispatch() already carried the machine from 'waiting' to 'acknowledged' within this one
// send() call — no second dispatch() was needed for that leg.
assert.equal(processA.machine.currentState.variant, 'acknowledged');

const completedA = processA.machine.waitForState('completed');
scheduler.advance(50);
await completedA;
assert.equal(processA.machine.currentState.variant, 'completed');
console.log('Job A final state:', processA.machine.currentState.variant);
kitA.stop();

// --- Scenario B: start -> cancelled via Signal before the scheduled advance fires;
// ProcessKit#stop() cancels the pending scheduled task too, so advancing time afterward
// has no effect. ---

const processB = Kit.make();
const kitB = processB.kit;
const controllerB = new AbortController();
const composedSignalB = await signalSource.compose({ 'signal': controllerB.signal });
const cancellationB = CancellationWiring.wireCancellation(kitB, composedSignalB);

kitB.start();
await kitB.dispatch({ 'type': 'start' });
assert.equal(processB.machine.currentState.variant, 'acknowledged');

controllerB.abort();
await cancellationB;
assert.equal(processB.machine.currentState.variant, 'cancelled');

// The scheduled advance is still pending on the shared scheduler; cancelling the machine
// does not by itself cancel it — only kit.stop() (or the task's own .cancel()) does.
// Since this kit is done, stop() tears down both the interpreter and any pending task.
kitB.stop();
scheduler.advance(50);
assert.equal(processB.machine.currentState.variant, 'cancelled', 'stop() must also cancel the pending scheduled task');
console.log('Job B final state:', processB.machine.currentState.variant);

// --- Scenario C: a deliberate rejection (TransitionRejectedError) is distinguishable from
// attempting a transition on an already-terminated machine (MachineTerminatedError). ---

const kitRejected = Kit.make().kit;
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
