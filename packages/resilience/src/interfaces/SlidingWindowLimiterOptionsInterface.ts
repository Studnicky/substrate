import type { SlidingWindowLimiterOptionsEntity } from '../entities/SlidingWindowLimiterOptionsEntity.js';
import type { RateLimiterClockInterface } from './RateLimiterClockInterface.js';

export interface SlidingWindowLimiterOptionsInterface extends SlidingWindowLimiterOptionsEntity.Type {
  readonly 'clock'?: RateLimiterClockInterface;
}
