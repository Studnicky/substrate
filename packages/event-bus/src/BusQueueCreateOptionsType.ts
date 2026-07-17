/** Full construction options for BusQueue including the handler and runtime-only fields. */

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';

export type BusQueueCreateOptionsType<T> = {
  'handler': (item: T) => Promise<void>;
  /** Drain-loop-level catch-all for uncaught handler errors — distinct from the per-event lifecycle hooks below, which are overridden on a subclass instead of passed as callbacks. */
  'onError'?: (err: unknown) => void;
  /** Runtime AbortSignal — not JSON-serializable, omitted from schema. */
  'signal'?: AbortSignal;
} & BusQueueOptionsEntity.Type;
