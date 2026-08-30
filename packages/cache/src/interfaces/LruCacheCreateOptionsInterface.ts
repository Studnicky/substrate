import type { ClockProviderInterface } from '@studnicky/clock';

import type { LruCacheOptionsEntity } from '../entities/LruCacheOptionsEntity.js';

/** Runtime collaborators and serializable settings accepted by `LruCache.create`. */
export interface LruCacheCreateOptionsInterface extends LruCacheOptionsEntity.Type {
  /** Clock that measures entry TTL and staleness. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
}
