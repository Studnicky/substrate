import type { FireOnAbortStartEffectEntity } from '../entities/FireOnAbortStartEffectEntity.js';

/** `cancelledCount` is computed internally from live state; never externally validated. */
export interface FireOnAbortStartEffectInterface {
  readonly 'cancelledCount': number;
  readonly 'variant': FireOnAbortStartEffectEntity.Type['variant'];
}
