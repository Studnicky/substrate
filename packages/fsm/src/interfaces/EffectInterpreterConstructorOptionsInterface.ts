import type { StateMachine } from '../StateMachine.js';
import type { EffectHandlerInterface } from './EffectHandlerInterface.js';

/**
 * Options accepted by `EffectInterpreter`'s protected constructor.
 *
 * A subclass that declares its own constructor needs this type to annotate
 * the parameter it forwards to `super()`. `machine` is required and
 * non-nullable, matching `create()`'s own required positional `machine`
 * parameter — enforced by the type system, not a runtime check.
 */
export interface EffectInterpreterConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect>;
  readonly 'machineId'?: string | undefined;
  readonly 'mailboxCapacity'?: number | undefined;
}
