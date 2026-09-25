import type { ClockProviderInterface } from '@studnicky/clock/browser';

/** Typed collaborators `LruCache.create` accepts alongside schema-validated options. */
export interface LruCacheCollaboratorsInterface {
  /** Clock that measures entry TTL and staleness. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
}
