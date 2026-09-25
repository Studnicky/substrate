import type { ClockProviderInterface } from '@studnicky/clock/browser';

import type { StateMachine } from '../StateMachine.js';
import type { EffectHandlerInterface } from './EffectHandlerInterface.js';

/** Typed collaborators `InterpreterHistory.create` accepts alongside schema-validated config. */
export interface InterpreterHistoryCollaboratorsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'clock'?: ClockProviderInterface;
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
  readonly 'machine'?: StateMachine<TState, TEvent, TEffect> | undefined;
}
