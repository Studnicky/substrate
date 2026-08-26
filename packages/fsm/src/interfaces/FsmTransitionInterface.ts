import type { FsmStepInterface } from './FsmStepInterface.js';

export interface FsmTransitionInterface<TState, TEvent, TEffect = never> {
  (state: TState, event: TEvent): FsmStepInterface<TState, TEffect>;
}
