import type { FireOnAdaptiveAdjustEffectEntity } from '../entities/FireOnAdaptiveAdjustEffectEntity.js';

/** `newLimit`/`previousLimit` are computed internally from live state; never externally validated. */
export interface FireOnAdaptiveAdjustEffectInterface {
  readonly 'newLimit': number;
  readonly 'previousLimit': number;
  readonly 'variant': FireOnAdaptiveAdjustEffectEntity.Type['variant'];
}
