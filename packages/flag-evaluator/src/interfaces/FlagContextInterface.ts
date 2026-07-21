import type { FlagContextEntity } from '../entities/FlagContextEntity.js';

/** Evaluation context passed to `FlagEvaluator#evaluate()`. */
export interface FlagContextInterface {
  [key: string]: unknown;
  /**
   * The identity bucketed for percentage rollout (e.g. a user or session id). Omitted means
   * every evaluation of the same flag with no `targetingKey` lands in the same bucket.
   */
  'targetingKey'?: FlagContextEntity.Type['targetingKey'];
}
