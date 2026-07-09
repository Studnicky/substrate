import type { SlidingWindowLimiterOptionsEntity } from '../entities/SlidingWindowLimiterOptionsEntity.js';

export interface SlidingWindowLimiterOptionsInterface extends SlidingWindowLimiterOptionsEntity.Type {
  readonly 'clock'?: () => number;
}
