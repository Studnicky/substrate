
import type { ClockProviderInterface } from '#runtime';

import type { EffectHandlerInterface } from './EffectHandlerInterface.js';

/**
 * Typed collaborators `InterpreterHistory.create` accepts alongside
 * schema-validated config. `machine` is not here — it is a required
 * positional parameter on `create()`, enforced by the type system rather
 * than an optional bag field checked at runtime.
 */
export interface InterpreterHistoryCollaboratorsInterface<
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'clock'?: ClockProviderInterface;
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;
}
