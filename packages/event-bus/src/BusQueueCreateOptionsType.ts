/** Full construction options for BusQueue including the handler and runtime-only fields. */

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';

export type BusQueueCreateOptionsType<T> = {
  readonly 'handler': (item: T) => Promise<void>;
  readonly 'onDequeue'?: (depth: number) => void;
  readonly 'onDrop'?: () => void;
  readonly 'onEnqueue'?: (depth: number) => void;
  readonly 'onError'?: (err: unknown) => void;
  readonly 'onHandlerError'?: (error: unknown) => void;
  readonly 'onOverflow'?: (depth: number) => void;
  readonly 'onSlowConsumer'?: (depth: number, highWaterMark: number) => void;
  /** Runtime AbortSignal — not JSON-serializable, omitted from schema. */
  readonly 'signal'?: AbortSignal;
} & BusQueueOptionsEntity.Type;
