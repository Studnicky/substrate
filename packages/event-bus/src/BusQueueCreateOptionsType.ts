/** Full construction options for BusQueue including the handler and runtime-only fields. */

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';

export type BusQueueCreateOptionsType<T> = {
  readonly 'handler': (item: T) => Promise<void>;
  readonly 'onError'?: (err: unknown) => void;
  /** Runtime AbortSignal — not JSON-serializable, omitted from schema. */
  readonly 'signal'?: AbortSignal;
} & BusQueueOptionsEntity.Type;
