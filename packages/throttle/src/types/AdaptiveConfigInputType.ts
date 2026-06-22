import type { AdaptiveConfigType } from '../interfaces/AdaptiveConfigType.js';

/**
 * Input configuration for adaptive concurrency adjustment
 *
 * Type alias composing from AdaptiveConfigType with most properties optional.
 * Only 'enabled' is required; other properties have defaults applied during validation.
 *
 * @see AdaptiveConfigType for the validated (complete) config with all defaults applied
 */
export type AdaptiveConfigInputType
  = Partial<Omit<AdaptiveConfigType, 'enabled'>>
  & Pick<AdaptiveConfigType, 'enabled'>;
