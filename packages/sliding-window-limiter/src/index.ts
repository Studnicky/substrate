/**
 * @studnicky/sliding-window-limiter
 * Sliding-window rate limiter: exact timestamp-log or approximate blended-counter algorithm.
 */

export { SlidingWindowLimiterOptionsEntity } from './entities/SlidingWindowLimiterOptionsEntity.js';

export { SlidingWindowLimiterConfigError } from './errors/SlidingWindowLimiterConfigError.js';
export { SlidingWindowLimiterError } from './errors/SlidingWindowLimiterError.js';

export type { SlidingWindowLimiterOptionsInterface } from './interfaces/SlidingWindowLimiterOptionsInterface.js';

export { SlidingWindowExhaustedError } from './SlidingWindowExhaustedError.js';
export { SlidingWindowLimiter } from './SlidingWindowLimiter.js';
