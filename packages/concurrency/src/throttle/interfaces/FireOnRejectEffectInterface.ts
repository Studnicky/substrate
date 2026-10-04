import type { FireOnRejectEffectEntity } from '../entities/FireOnRejectEffectEntity.js';

/** Runtime lifecycle effect that adds a non-JSON Error value to its canonical discriminator. */
export interface FireOnRejectEffectInterface extends FireOnRejectEffectEntity.Type {
  readonly 'reason': Error;
}
