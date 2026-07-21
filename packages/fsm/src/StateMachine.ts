import type { FsmStepInterface } from './FsmStepInterface.js';

import { FsmHookInvoker } from './FsmHookInvoker.js';
import { MachineTerminatedError } from './MachineTerminatedError.js';
import { ReducerThrewError } from './ReducerThrewError.js';
import { TransitionRejectedError } from './TransitionRejectedError.js';

export abstract class StateMachine<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect = never
> {
  protected readonly hooks: FsmHookInvoker;

  protected constructor() {
    this.hooks = new FsmHookInvoker();
  }

  /** Count of lifecycle hook failures captured since construction. */
  get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  abstract getInitialState(): TState;

  abstract reduce(state: TState, event: TEvent): FsmStepInterface<TState, TEffect>;

  transition(state: TState, event: TEvent): FsmStepInterface<TState, TEffect> {
    if (this.isTerminated(state)) {
      this.hooks.invoke('onTerminatedAccess', () => { const result = this.onTerminatedAccess(state, event);
        return result; });
      throw new MachineTerminatedError({ 'eventType': event.type, 'stateVariant': state.variant });
    }

    try {
      const step = this.reduce(state, event);
      const toVariant = step.state.variant;
      const fromVariant = state.variant;
      if (fromVariant !== toVariant) {
        this.hooks.invoke('onExitState', () => { const result = this.onExitState(state);
          return result; });
        this.hooks.invoke('onTransition', () => { const result = this.onTransition(state, step.state, event);
          return result; });
        this.hooks.invoke('onEnterState', () => { const result = this.onEnterState(step.state);
          return result; });
      }
      return step;
    } catch (cause: unknown) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      this.hooks.invoke('onTransitionRejected', () => { const result = this.onTransitionRejected(state, event, reason);
        return result; });
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
