import type { PipelineInterface } from '@studnicky/pipeline/interfaces';

import type { EffectHandlerInterface } from './interfaces/EffectHandlerInterface.js';
import type { PipelineEffectInterface } from './interfaces/PipelineEffectInterface.js';

export class PipelineEffectHandler {
  static create<TEvent extends { readonly 'type': string }>(
    pipeline: PipelineInterface<TEvent>
  ): EffectHandlerInterface<PipelineEffectInterface<TEvent>, TEvent> {
    return async (effect, dispatch): Promise<void> => {
      const event = await pipeline.run(effect.event);
      dispatch(event);
    };
  }
}
