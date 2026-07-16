/** Bounded node:worker_threads pool that fans work items across workers via a typed message envelope */

import { Batch } from '@studnicky/batch';
import { Signal } from '@studnicky/signal';
import { System } from '@studnicky/system';
import { Worker } from 'node:worker_threads';

import type { WorkerEnvelopeType } from './types/WorkerEnvelopeType.js';
import type { WorkerPoolConfigType } from './types/WorkerPoolConfigType.js';

import { WorkerPoolBuilder } from './WorkerPoolBuilder.js';

// json-schema-uninexpressible: 'signal' is a live Signal class instance — not a serializable data shape
type WorkerPoolDepsType = {
  'concurrency': number;
  'signal': Signal;
  'timeoutMs'?: number | undefined;
  'workerPath': string;
};

// json-schema-uninexpressible: 'item' is a generic TMessage type parameter — the payload shape is caller-defined, not a fixed domain shape
type IndexedItemType<TMessage> = {
  'index': number;
  'item': TMessage;
};

/**
 * Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded
 * `node:worker_threads` pool: `run()` fans a list of work items across at most `concurrency`
 * concurrently-running workers, each spawned fresh against `workerPath` and terminated once its
 * item settles.
 *
 * Every envelope a worker posts back — `log`, `progress`, `result`, or `error` — fires
 * `onMessage()`. A `'result'` envelope resolves that item; a `'error'` envelope, an uncaught
 * worker `'error'` event, an unexpected `'exit'`, or exceeding `timeoutMs` all reject it.
 *
 * `run()`'s ordering and failure semantics follow `Batch#process()` directly, since that is the
 * scheduling loop `run()` delegates to: results resolve in the same order as `items`, and the
 * first item to reject makes the whole `run()` call reject (`Promise.all`-like fail-fast) —
 * items already in flight in the same batch are not aborted, but items in batches that have not
 * started yet never spawn. Use `Batch#processSettled()`-style partial-failure semantics yourself
 * by driving `WorkerPool` per-item instead of through `run()` if a caller needs every item's
 * outcome regardless of failures.
 *
 * @example
 * ```typescript
 * const pool = WorkerPool.create({ workerPath: new URL('./worker.mjs', import.meta.url).pathname });
 * const results = await pool.run([1, 2, 3]);
 * ```
 */
export class WorkerPool<TMessage = unknown, TResult = unknown> {
  /**
   * Creates a new WorkerPool, defaulting `concurrency` to `System.optimalWorkerCount` and
   * `signal` to a fresh `Signal.create()` when omitted.
   *
   * @param config - `workerPath` is required; every other field defaults
   * @returns New WorkerPool instance
   */
  static create<TMessage = unknown, TResult = unknown>(
    config: WorkerPoolConfigType
  ): WorkerPool<TMessage, TResult> {
    if (typeof config.workerPath !== 'string' || config.workerPath.length === 0) {
      throw new Error('WorkerPool: workerPath is required');
    }

    const result = new this<TMessage, TResult>({
      'concurrency': config.concurrency ?? System.optimalWorkerCount,
      'signal': config.signal ?? Signal.create(),
      'timeoutMs': config.timeoutMs,
      'workerPath': config.workerPath
    });
    return result;
  }

  static builder<TMessage = unknown, TResult = unknown>(): WorkerPoolBuilder<TMessage, TResult> {
    const result = WorkerPoolBuilder.create<TMessage, TResult>((config) => {
      const pool = WorkerPool.create<TMessage, TResult>(config);
      return pool;
    });
    return result;
  }

  readonly #workerPath: string;
  readonly #concurrency: number;
  readonly #timeoutMs: number | undefined;
  readonly #signal: Signal;

  protected constructor(deps: WorkerPoolDepsType) {
    this.#workerPath = deps.workerPath;
    this.#concurrency = deps.concurrency;
    this.#timeoutMs = deps.timeoutMs;
    this.#signal = deps.signal;
  }

  /**
   * Fans `items` across at most `concurrency` concurrently-running workers and resolves an
   * ordered results array. See the class doc for ordering/failure semantics.
   *
   * @param items - Work items posted one-per-worker as the initial `postMessage`
   * @returns Results in the same order as `items`
   */
  async run(items: readonly TMessage[]): Promise<TResult[]> {
    const batch = Batch.create<TResult>(this.#concurrency);
    const indexed: IndexedItemType<TMessage>[] = items.map((item, index) => {return { 'index': index, 'item': item };});

    const results: TResult[] = [];
    for await (const chunk of batch.process(indexed, (entry) => { const result = this.#runWorker(entry.item, entry.index); return result; })) {
      results.push(...chunk);
    }

    return results;
  }

  getSignal(): Signal {
    return this.#signal;
  }

  #runWorker(item: TMessage, index: number): Promise<TResult> {
    return new Promise<TResult>((resolve, reject) => {
      const worker = new Worker(this.#workerPath);
      let settled = false;

      const timeoutSignal = this.#timeoutMs !== undefined ? this.#signal.timeout(this.#timeoutMs) : undefined;

      const onTimeoutAbort = (): void => {
        settle(() => {
          this.#invokeHook(() => { this.onWorkerTimeout(index); });
          void worker.terminate();
          reject(new Error(`WorkerPool: task at index ${String(index)} exceeded its timeout`));
        });
      };

      const cleanup = (): void => {
        timeoutSignal?.removeEventListener('abort', onTimeoutAbort);
        worker.removeAllListeners();
      };

      const settle = (fn: () => void): void => {
        if (settled) { return; }
        settled = true;
        cleanup();
        fn();
      };

      timeoutSignal?.addEventListener('abort', onTimeoutAbort, { 'once': true });

      worker.on('message', (envelope: WorkerEnvelopeType<TMessage, TResult>) => {
        this.#invokeHook(() => { this.onMessage(envelope, index); });

        if (envelope.type === 'result') {
          settle(() => {
            void worker.terminate();
            resolve(envelope.value);
          });
          return;
        }

        if (envelope.type === 'error') {
          settle(() => {
            const error = new Error(envelope.error);
            this.#invokeHook(() => { this.onWorkerError(error, index); });
            void worker.terminate();
            reject(error);
          });
        }
      });

      worker.on('error', (error: Error) => {
        settle(() => {
          this.#invokeHook(() => { this.onWorkerError(error, index); });
          reject(error);
        });
      });

      worker.on('exit', (code: number) => {
        settle(() => {
          reject(new Error(`WorkerPool: worker at index ${String(index)} exited with code ${String(code)} before returning a result`));
        });
      });

      worker.postMessage(item);
    });
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires for every envelope a worker posts back — `log`, `progress`, `result`, and `error` alike. */
  protected onMessage(_envelope: WorkerEnvelopeType<TMessage, TResult>, _index: number): void {}

  /** Fires when a task exceeds its configured `timeoutMs`, immediately before the worker is terminated. */
  protected onWorkerTimeout(_index: number): void {}

  /** Fires when a task rejects — a `'error'` envelope, an uncaught worker `'error'` event, or an unexpected exit. */
  protected onWorkerError(_error: Error, _index: number): void {}
}
