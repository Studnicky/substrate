/**
 * @studnicky/throttle
 * Generic async operation throttle with sliding window concurrency control
 */

export { AbortResultEntity } from './entities/AbortResultEntity.js';
export { AdaptiveConfigEntity } from './entities/AdaptiveConfigEntity.js';
export { AdaptiveStatsEntity } from './entities/AdaptiveStatsEntity.js';
export { LatencyStatsEntity } from './entities/LatencyStatsEntity.js';
export { ThrottleConfigEntity } from './entities/ThrottleConfigEntity.js';
export { ThrottleStatsEntity } from './entities/ThrottleStatsEntity.js';
export {
  ConfigurationError,
  ThrottleAbortedError,
  ThrottleDrainingError
} from './errors/index.js';
export type { ThrottleBuilderInterface } from './interfaces/ThrottleBuilderInterface.js';
export type { ThrottleInterface } from './interfaces/ThrottleInterface.js';
export { Throttle } from './throttle/Throttle.js';
export { ThrottleBuilder } from './throttle/ThrottleBuilder.js';
export { ThrottleConfigValidator } from './throttle/validation/ThrottleConfigValidator.js';
export { ThrottleStatsValidator } from './throttle/validation/ThrottleStatsValidator.js';
export { ThrottleValidator } from './throttle/validation/ThrottleValidator.js';
