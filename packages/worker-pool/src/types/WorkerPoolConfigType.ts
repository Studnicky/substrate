import type { Signal } from '@studnicky/signal';

/** Config accepted by `WorkerPool.create()`. `workerPath` is required; every other field defaults. */
// json-schema-uninexpressible: 'signal' accepts a pre-built Signal class instance — not a serializable data shape
export type WorkerPoolConfigType = {
  /** Maximum number of workers running concurrently. Defaults to `System.optimalWorkerCount`. */
  'concurrency'?: number;
  /** Composed `Signal` instance used to derive the per-task timeout `AbortSignal`. Defaults to a fresh `Signal.create()`. */
  'signal'?: Signal;
  /** Per-task timeout in ms. Omit for no timeout. */
  'timeoutMs'?: number;
  /** Path to the `node:worker_threads` entry script every spawned `Worker` runs. */
  'workerPath': string;
};
