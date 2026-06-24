import type { TokenBucketOptionsEntity } from '../entities/TokenBucketOptionsEntity.js';

export interface TokenBucketOptionsInterface extends TokenBucketOptionsEntity.Type {
  readonly 'clock'?: () => number;
}
