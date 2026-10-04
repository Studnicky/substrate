import type { FireOnDrainCompleteEffectEntity } from '../entities/FireOnDrainCompleteEffectEntity.js';

/** `totalExecuted` is computed internally from live state; never externally validated. */
export interface FireOnDrainCompleteEffectInterface {
  readonly 'totalExecuted': number;
  readonly 'variant': FireOnDrainCompleteEffectEntity.Type['variant'];
}
