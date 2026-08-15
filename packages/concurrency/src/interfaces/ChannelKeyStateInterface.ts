import type { ChannelKeyVariantEntity } from '../entities/ChannelKeyVariantEntity.js';

/**
 * Wraps `ChannelKeyVariantEntity.Type` in the `{ readonly variant }` shape
 * `@studnicky/fsm`'s `StateMachine` requires of its state type.
 */
export interface ChannelKeyStateInterface {
  readonly 'variant': ChannelKeyVariantEntity.Type;
}
