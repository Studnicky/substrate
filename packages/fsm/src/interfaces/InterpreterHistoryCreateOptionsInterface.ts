import type { CircularBufferOptionsEntity } from '@studnicky/circular-buffer/entities';
import type { ClockProviderInterface } from '@studnicky/clock';

import type { StateMachine } from '../StateMachine.js';
import type { EffectHandlerInterface } from './EffectHandlerInterface.js';

/** Construction settings and timing provider for `InterpreterHistory`. */
export interface InterpreterHistoryCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'capacity': NonNullable<CircularBufferOptionsEntity.Type['capacity']>;
  readonly 'clock'?: ClockProviderInterface;
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
}
