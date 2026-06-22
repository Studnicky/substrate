import type { FsmStepType } from './FsmStepType.js';

import { ReducerThrewError } from './ReducerThrewError.js';

export abstract class StateMachine<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect = never
> {
  abstract getInitialState(): TState;

  abstract reduce(state: TState, event: TEvent): FsmStepType<TState, TEffect>;

  transition(state: TState, event: TEvent): FsmStepType<TState, TEffect> {
    try {
      return this.reduce(state, event);
    } catch (cause: unknown) {
      throw new ReducerThrewError({
        'cause': cause,
        'eventType': event.type,
        'stateVariant': state.variant
      });
    }
  }
}
