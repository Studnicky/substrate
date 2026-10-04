import type { PipelineEffectVariantEntity } from '../entities/PipelineEffectVariantEntity.js';

export interface PipelineEffectInterface<TEvent extends { readonly 'type': string }> {
  readonly 'event': TEvent;
  readonly 'variant': PipelineEffectVariantEntity.Type;
}
