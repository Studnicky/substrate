import type { FireOnDrainStartEffectEntity } from '../entities/FireOnDrainStartEffectEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface FireOnDrainStartEffectInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'variant': FireOnDrainStartEffectEntity.Type['variant'];
}
