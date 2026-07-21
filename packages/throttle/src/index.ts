/**
 * @studnicky/throttle
 * Generic async operation throttle with sliding window concurrency control
 */

export { AbortResultEntity } from './entities/AbortResultEntity.js';
export { ActiveOperationStateEntity } from './entities/ActiveOperationStateEntity.js';
export { AdaptiveConfigEntity } from './entities/AdaptiveConfigEntity.js';
export { AdaptiveStatsEntity } from './entities/AdaptiveStatsEntity.js';
export { LatencyStatsEntity } from './entities/LatencyStatsEntity.js';
export { ThrottleAbortOptionsEntity } from './entities/ThrottleAbortOptionsEntity.js';
export { ThrottleConfigEntity } from './entities/ThrottleConfigEntity.js';
export { ThrottleStateEntity } from './entities/ThrottleStateEntity.js';
export { ThrottleStatsEntity } from './entities/ThrottleStatsEntity.js';
export { ValidatedAdaptiveConfigEntity } from './entities/ValidatedAdaptiveConfigEntity.js';
export { ValidatedThrottleConfigEntity } from './entities/ValidatedThrottleConfigEntity.js';
export {
  ThrottleAbortedError,
  ThrottleDrainingError
} from './errors/index.js';
export type { ThrottleInterface } from './interfaces/ThrottleInterface.js';
export { Throttle } from './throttle/Throttle.js';
export { ThrottleValidator } from './throttle/validation/ThrottleValidator.js';
