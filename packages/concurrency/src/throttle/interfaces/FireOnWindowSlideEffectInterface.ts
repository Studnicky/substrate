import type { FireOnWindowSlideEffectEntity } from '../entities/FireOnWindowSlideEffectEntity.js';

/** `activeCount`/`queuedCount` are computed internally from live state; never externally validated. */
export interface FireOnWindowSlideEffectInterface {
  readonly 'activeCount': number;
  readonly 'queuedCount': number;
  readonly 'variant': FireOnWindowSlideEffectEntity.Type['variant'];
}
