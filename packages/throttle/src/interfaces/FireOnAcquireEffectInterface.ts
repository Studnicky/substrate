import type { FireOnAcquireEffectEntity } from '../entities/FireOnAcquireEffectEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface FireOnAcquireEffectInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'variant': FireOnAcquireEffectEntity.Type['variant'];
}
