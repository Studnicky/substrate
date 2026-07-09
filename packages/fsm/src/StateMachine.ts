import type { FsmStepType } from './FsmStepType.js';

import { MachineTerminatedError } from './MachineTerminatedError.js';
import { ReducerThrewError } from './ReducerThrewError.js';
import { TransitionRejectedError } from './TransitionRejectedError.js';

export abstract class StateMachine<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect = never
> {
  protected constructor() {}

  abstract getInitialState(): TState;

  abstract reduce(state: TState, event: TEvent): FsmStepType<TState, TEffect>;

  transition(state: TState, event: TEvent): FsmStepType<TState, TEffect> {
    if (this.isTerminated(state)) {
      this.#invokeHook(() => { this.onTerminatedAccess(state, event); });
      throw new MachineTerminatedError({ 'eventType': event.type, 'stateVariant': state.variant });
    }

    try {
      const step = this.reduce(state, event);
      const toVariant = step.state.variant;
      const fromVariant = state.variant;
      if (fromVariant !== toVariant) {
        this.#invokeHook(() => { this.onExitState(state); });
        this.#invokeHook(() => { this.onTransition(state, step.state, event); });
        this.#invokeHook(() => { this.onEnterState(step.state); });
      }
      return step;
    } catch (cause: unknown) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      this.#invokeHook(() => { this.onTransitionRejected(state, event, reason); });
      if (cause instanceof TransitionRejectedError) {
        throw cause;
      }
      throw new ReducerThrewError({
        'cause': cause,
        'eventType': event.type,
        'stateVariant': state.variant
      });
    }
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override to add logging/tracing/metrics. Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires after a successful state transition, before the new state is returned. */
  protected onTransition(_from: TState, _to: TState, _event: TEvent): void {}

  /** Fires when entering a new state variant (not called when variant is unchanged). */
  protected onEnterState(_state: TState): void {}

  /** Fires when exiting a state variant (not called when variant is unchanged). */
  protected onExitState(_state: TState): void {}

  /**
   * Fires when `reduce` throws — i.e. no valid transition exists, the reducer
   * deliberately rejected the event (`TransitionRejectedError`), or the
   * reducer has a defect (any other thrown value, surfaced to the caller as
   * `ReducerThrewError`).
   */
  protected onTransitionRejected(_state: TState, _event: TEvent, _reason: string): void {}

  /**
   * Determines whether `state` is terminal — i.e. no further transitions are
   * permitted. Default: never terminated. Override to mark specific state
   * variants as final.
   */
  protected isTerminated(_state: TState): boolean { const result = false;
    return result; }

  /**
   * Fires when `transition()` is called against a state `isTerminated()`
   * reports as terminated, before `MachineTerminatedError` is thrown.
   * `reduce()` is not invoked in this case.
   */
  protected onTerminatedAccess(_state: TState, _event: TEvent): void {}
}
