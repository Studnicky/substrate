import type { TokenBucketOptionsEntity } from '../entities/TokenBucketOptionsEntity.js';
import type { RateLimiterClockInterface } from './RateLimiterClockInterface.js';

export interface TokenBucketOptionsInterface extends TokenBucketOptionsEntity.InputType {
  readonly 'clock'?: RateLimiterClockInterface;
}
