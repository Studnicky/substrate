/**
 * @studnicky/throttle
 * Generic async operation throttle with sliding window concurrency control
 */

export { AdaptiveConfigEntity } from './entities/AdaptiveConfigEntity.js';
export { ThrottleConfigEntity } from './entities/ThrottleConfigEntity.js';
export {
  ConfigurationError,
  ThrottleAbortedError,
  ThrottleDrainingError
} from './errors/index.js';
export type { ThrottleBuilderInterface } from './interfaces/ThrottleBuilderInterface.js';
export type { ThrottleInterface } from './interfaces/ThrottleInterface.js';
export { Throttle } from './throttle/Throttle.js';
export { ThrottleBuilder } from './throttle/ThrottleBuilder.js';
export { isThrottle } from './throttle/validation/isThrottle.js';
export { isThrottleConfig } from './throttle/validation/isThrottleConfig.js';
export { isThrottleStats } from './throttle/validation/isThrottleStats.js';
export type { AbortResultType } from './types/AbortResultType.js';
export type { AdaptiveStatsType } from './types/AdaptiveStatsType.js';
export type { ThrottleStatsType } from './types/ThrottleStatsType.js';
