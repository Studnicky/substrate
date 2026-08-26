import type { ChannelKeyTransitionTypeEntity } from '../entities/ChannelKeyTransitionTypeEntity.js';

/** Requests a per-key lifecycle transition for `Channel`. */
export interface ChannelKeyTransitionEventInterface {
  readonly 'type': ChannelKeyTransitionTypeEntity.Type;
}
