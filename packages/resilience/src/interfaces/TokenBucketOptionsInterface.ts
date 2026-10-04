import type { MonotonicNowInterface } from '@studnicky/clock/monotonic-now/interfaces';

import type { TokenBucketOptionsEntity } from '../entities/TokenBucketOptionsEntity.js';

export interface TokenBucketOptionsInterface extends TokenBucketOptionsEntity.InputType {
  readonly 'clock'?: MonotonicNowInterface;
}
