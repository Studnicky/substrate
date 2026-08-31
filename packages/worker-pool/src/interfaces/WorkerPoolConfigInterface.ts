import type { Signal } from '@studnicky/signal';

import type { WorkerPoolConfigEntity } from '../entities/WorkerPoolConfigEntity.js';

/** Config accepted by `WorkerPool.create()`. `workerPath` is required; every other field defaults. */
export interface WorkerPoolConfigInterface extends WorkerPoolConfigEntity.Type {
  /** Optional caller cancellation source composed with each task deadline. */
  'abortSignal'?: AbortSignal;
  /** Composed `Signal` primitive used to derive each task's cancellation signal. Defaults to a fresh `Signal.create()`. */
  'signal'?: Signal;
}
