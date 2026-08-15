import type { CoalesceKeyTransitionTypeEntity } from '../entities/CoalesceKeyTransitionTypeEntity.js';

/** Requests a per-key lifecycle transition for `Coalesce`. */
export interface CoalesceKeyTransitionEventInterface {
  readonly 'type': CoalesceKeyTransitionTypeEntity.Type;
}
