import type { FsmStepType } from './FsmStepType.js';

import { ReducerThrewError } from './ReducerThrewError.js';

export abstract class StateMachine<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect = never
> {
  protected constructor() {}

  abstract getInitialState(): TState;

  abstract reduce(state: TState, event: TEvent): FsmStepType<TState, TEffect>;

  transition(state: TState, event: TEvent): FsmStepType<TState, TEffect> {
    try {
      const step = this.reduce(state, event);
      const toVariant = step.state.variant;
      const fromVariant = state.variant;
      if (fromVariant !== toVariant) {
        this.onExitState(state);
        this.onTransition(state, step.state, event);
        this.onEnterState(step.state);
      }
      return step;
    } catch (cause: unknown) {
      this.onTransitionRejected(state, event, cause instanceof Error ? cause.message : String(cause));
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
   * Fires when `reduce` throws — i.e. no valid transition exists or the guard
   * inside the reducer rejected the event.
   */
  protected onTransitionRejected(_state: TState, _event: TEvent, _reason: string): void {}
}
