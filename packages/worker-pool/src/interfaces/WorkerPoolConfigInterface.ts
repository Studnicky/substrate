import type { Signal } from '@studnicky/signal';

import type { WorkerPoolConfigEntity } from '../entities/WorkerPoolConfigEntity.js';

/** Config accepted by `WorkerPool.create()`. `workerPath` is required; every other field defaults. */
export interface WorkerPoolConfigInterface extends WorkerPoolConfigEntity.Type {
  /** Composed `Signal` instance used to derive the per-task timeout `AbortSignal`. Defaults to a fresh `Signal.create()`. */
  'signal'?: Signal;
}
