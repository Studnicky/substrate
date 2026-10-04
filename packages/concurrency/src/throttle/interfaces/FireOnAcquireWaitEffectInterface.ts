import type { FireOnAcquireWaitEffectEntity } from '../entities/FireOnAcquireWaitEffectEntity.js';

/** `queuedCount` is computed internally from live state; never externally validated. */
export interface FireOnAcquireWaitEffectInterface {
  readonly 'queuedCount': number;
  readonly 'variant': FireOnAcquireWaitEffectEntity.Type['variant'];
}
