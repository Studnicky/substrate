import type { MonotonicNowInterface } from '@studnicky/clock/monotonic-now/interfaces';

import type { SlidingWindowLimiterOptionsEntity } from '../entities/SlidingWindowLimiterOptionsEntity.js';

export interface SlidingWindowLimiterOptionsInterface extends SlidingWindowLimiterOptionsEntity.InputType {
  readonly 'clock'?: MonotonicNowInterface;
}
