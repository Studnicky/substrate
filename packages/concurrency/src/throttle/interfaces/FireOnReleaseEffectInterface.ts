import type { FireOnReleaseEffectEntity } from '../entities/FireOnReleaseEffectEntity.js';

/** `activeCount`/`totalExecuted` are computed internally from live state; never externally validated. */
export interface FireOnReleaseEffectInterface {
  readonly 'activeCount': number;
  readonly 'totalExecuted': number;
  readonly 'variant': FireOnReleaseEffectEntity.Type['variant'];
}
