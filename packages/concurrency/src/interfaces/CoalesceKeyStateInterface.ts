import type { CoalesceKeyVariantEntity } from '../entities/CoalesceKeyVariantEntity.js';

/**
 * Wraps `CoalesceKeyVariantEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface CoalesceKeyStateInterface {
  readonly 'variant': CoalesceKeyVariantEntity.Type;
}
