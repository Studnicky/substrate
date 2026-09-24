import type { ClockProviderInterface } from '@studnicky/clock/browser';

import type { LruCacheOptionsEntity } from '../entities/LruCacheOptionsEntity.js';

/** Runtime collaborators and not-yet-validated settings accepted by `LruCache.create`; `LruCacheOptionsEntity.validate` is the runtime gate. */
export interface LruCacheCreateOptionsInterface extends LruCacheOptionsEntity.InputType {
  /** Clock that measures entry TTL and staleness. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
}
