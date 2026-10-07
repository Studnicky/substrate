import type { FireOnContendedEffectEntity } from '../entities/FireOnContendedEffectEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface FireOnContendedEffectInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'variant': FireOnContendedEffectEntity.Type['variant'];
}
