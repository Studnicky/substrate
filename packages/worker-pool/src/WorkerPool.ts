/** Bounded node:worker_threads pool that fans work items across workers via a typed message envelope */

import { Batch } from '@studnicky/batch';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { Signal } from '@studnicky/signal';
import { System } from '@studnicky/system';
import { Worker } from 'node:worker_threads';

import type { WorkerEnvelopeType } from './types/WorkerEnvelopeType.js';
import type { WorkerPoolConfigType } from './types/WorkerPoolConfigType.js';

import { WorkerPoolBuilder } from './WorkerPoolBuilder.js';

/**
 * Composed `HookInvoker` for `WorkerPool` — records a hook failure into the
 * owning `WorkerPool`'s `#hookErrors` array via a constructor callback instead
 * of throwing. Hoisted to module scope so V8 compiles this class once rather
 * than per `WorkerPool` instantiation.
 */
class WorkerPoolHookInvoker extends HookInvoker {
  constructor(private readonly recordFailure: (hookName: string, cause: unknown) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.recordFailure(hookName, cause);
    return undefined as T;
  }
}

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
 * concurrently-running workers. Workers are long-lived for the duration of a single `run()`
 * call — spun up as needed up to `concurrency`, reused across every item dispatched during
 * that call, and terminated only after every dispatched item has settled. Pool state (idle
 * workers, in-flight task tracking, the pending-item queue) lives entirely in `run()`'s own
 * scope, so two concurrent `run()` calls on the same instance never share or corrupt each
 * other's workers.
 *
 * Every envelope a worker posts back — `log`, `progress`, `result`, or `error` — fires
 * `onMessage()`. A `'result'` envelope resolves that item; a `'error'` envelope, an uncaught
 * worker `'error'` event, an unexpected `'exit'`, or exceeding `timeoutMs` all reject it. A
 * worker that vanishes (`'exit'`) without a matching envelope while a task is still assigned
 * to it is retried once on a freshly spawned replacement before being treated as a failure —
 * this absorbs a worker thread tearing itself down on its own between tasks, while a task that
 * fails a second time still surfaces as a rejection.
 *
 * `run()`'s ordering and failure semantics follow `Batch#process()` directly, since that is the
 * scheduling loop `run()` delegates to: results resolve in the same order as `items`, and the
 * first item to reject makes the whole `run()` call reject (`Promise.all`-like fail-fast) —
 * items already in flight in the same batch are not aborted, but items in batches that have not
 * started yet never spawn. The pool waits for every dispatched item to settle (whether it
 * resolved or rejected) before terminating its workers, so an in-flight sibling is never killed
 * out from under it merely because another item in the same batch rejected first. Use
 * `Batch#processSettled()`-style partial-failure semantics yourself by driving `WorkerPool`
 * per-item instead of through `run()` if a caller needs every item's outcome regardless of
 * failures.
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

  /**
   * Errors raised by lifecycle hook overrides, recorded by `onHookError`
   * instead of aborting in-flight worker dispatch or task settlement.
   */
  readonly #hookErrors: HookInvocationError[] = [];

  protected readonly hooks: HookInvoker;

  protected constructor(deps: WorkerPoolDepsType) {
    this.hooks = new WorkerPoolHookInvoker((hookName, cause) => {
      this.#hookErrors.push(new HookInvocationError(hookName, cause));
    });
    this.#workerPath = deps.workerPath;
    this.#concurrency = deps.concurrency;
    this.#timeoutMs = deps.timeoutMs;
    this.#signal = deps.signal;
  }

  /**
   * Fans `items` across at most `concurrency` concurrently-running workers and resolves an
   * ordered results array. See the class doc for pooling, ordering, and failure semantics.
   *
   * @param items - Work items posted one-per-task via `postMessage` to a pooled worker
   * @returns Results in the same order as `items`
   */
  async run(items: readonly TMessage[]): Promise<TResult[]> {
    // json-schema-uninexpressible: 'reject'/'resolve'/'unregisterTimeout' are function-typed callbacks — run-local scheduling state, never serialized
    type TaskContextType = {
      'index': number;
      'item': TMessage;
      'reject': (error: Error) => void;
      'resolve': (value: TResult) => void;
      'retried': boolean;
      'settled': boolean;
      'unregisterTimeout': () => void;
    };

    // json-schema-uninexpressible: 'item'/'resolve'/'reject' close over the caller's generic TMessage/TResult — run-local scheduling state, never serialized
    type PendingEntryType = {
      'index': number;
      'item': TMessage;
      'reject': (error: Error) => void;
      'resolve': (value: TResult) => void;
      'retried'?: boolean;
    };

    const currentTaskByWorker = new Map<Worker, TaskContextType>();
    const liveWorkers = new Set<Worker>();
    const idleWorkers: Worker[] = [];
    const pendingQueue: PendingEntryType[] = [];
    let spawnedCount = 0;
    let shuttingDown = false;

    const settleTask = (worker: Worker, fn: (context: TaskContextType) => void): void => {
      const context = currentTaskByWorker.get(worker);
      if (context === undefined || context.settled) { return; }
      context.settled = true;
      context.unregisterTimeout();
      currentTaskByWorker.delete(worker);
      fn(context);
    };

    const freeWorker = (worker: Worker): void => {
      const next = pendingQueue.shift();
      if (next !== undefined) {
        assignTask(worker, next);
        return;
      }
      idleWorkers.push(worker);
    };

    const assignTask = (worker: Worker, entry: PendingEntryType): void => {
      const timeoutSignal = this.#timeoutMs !== undefined ? this.#signal.timeout(this.#timeoutMs) : undefined;

      const context: TaskContextType = {
        'index': entry.index,
        'item': entry.item,
        'reject': entry.reject,
        'resolve': entry.resolve,
        'retried': entry.retried === true,
        'settled': false,
        'unregisterTimeout': WorkerPool.#noopUnregisterTimeout
      };

      const onTimeoutAbort = (): void => {
        settleTask(worker, (ctx) => {
          this.hooks.invoke('onWorkerTimeout', () => {
            const result = this.onWorkerTimeout(ctx.index);
            return result;
          });
          ctx.reject(new Error(`WorkerPool: task at index ${String(ctx.index)} exceeded its timeout`));
          worker.terminate().catch(() => {});
        });
      };

      context.unregisterTimeout = () => {
        timeoutSignal?.removeEventListener('abort', onTimeoutAbort);
      };

      timeoutSignal?.addEventListener('abort', onTimeoutAbort, { 'once': true });

      currentTaskByWorker.set(worker, context);
      worker.postMessage(entry.item);
    };

    const handleResultEnvelope = (worker: Worker, value: TResult): void => {
      settleTask(worker, (ctx) => {
        ctx.resolve(value);
        freeWorker(worker);
      });
    };

    const handleErrorEnvelope = (worker: Worker, message: string): void => {
      settleTask(worker, (ctx) => {
        const error = new Error(message);
        this.hooks.invoke('onWorkerError', () => {
          const result = this.onWorkerError(error, ctx.index);
          return result;
        });
        ctx.reject(error);
        freeWorker(worker);
      });
    };

    const createWorker = (): Worker => {
      const worker = new Worker(this.#workerPath);
      liveWorkers.add(worker);
      this.hooks.invoke('onWorkerCreated', () => {
        const result = this.onWorkerCreated(worker.threadId);
        return result;
      });

      worker.on('message', (envelope: WorkerEnvelopeType<TMessage, TResult>) => {
        const context = currentTaskByWorker.get(worker);
        if (context === undefined) {
          // Stray envelope for a worker with no assigned task — ignore safely.
          return;
        }

        this.hooks.invoke('onMessage', () => {
          const result = this.onMessage(envelope, context.index);
          return result;
        });

        switch (envelope.type) {
          case 'error':
            handleErrorEnvelope(worker, envelope.error);
            break;
          case 'log':
          case 'progress':
            break;
          case 'result':
            handleResultEnvelope(worker, envelope.value);
            break;
          default:
            WorkerPool.#assertExhaustiveEnvelope(envelope);
        }
      });

      worker.on('error', (error: Error) => {
        settleTask(worker, (ctx) => {
          this.hooks.invoke('onWorkerError', () => {
            const result = this.onWorkerError(error, ctx.index);
            return result;
          });
          ctx.reject(error);
        });
        worker.terminate().catch(() => {});
      });

      worker.on('exit', (code: number) => {
        liveWorkers.delete(worker);
        const idleIndex = idleWorkers.indexOf(worker);
        if (idleIndex !== -1) { idleWorkers.splice(idleIndex, 1); }

        const context = currentTaskByWorker.get(worker);

        if (context === undefined || context.settled) {
          if (!shuttingDown) {
            const replacement = createWorker();
            freeWorker(replacement);
          }
          return;
        }

        currentTaskByWorker.delete(worker);

        // A worker that vanishes mid-task without a matching envelope is retried once on a
        // freshly spawned worker before being treated as a failure — this absorbs a worker
        // thread tearing itself down on its own between tasks, while a task that still fails
        // after the retry surfaces as a genuine rejection.
        if (!context.retried && !shuttingDown) {
          const replacement = createWorker();
          assignTask(replacement, {
            'index': context.index,
            'item': context.item,
            'reject': context.reject,
            'resolve': context.resolve,
            'retried': true
          });
          return;
        }

        context.reject(new Error(`WorkerPool: worker at index ${String(context.index)} exited with code ${String(code)} before returning a result`));

        if (!shuttingDown) {
          const replacement = createWorker();
          freeWorker(replacement);
        }
      });

      return worker;
    };

    const dispatch = (item: TMessage, index: number): Promise<TResult> => {return new Promise<TResult>((resolve, reject) => {
      const entry: PendingEntryType = { 'index': index, 'item': item, 'reject': reject, 'resolve': resolve };

      const idleWorker = idleWorkers.pop();
      if (idleWorker !== undefined) {
        assignTask(idleWorker, entry);
        return;
      }

      if (spawnedCount < this.#concurrency) {
        spawnedCount += 1;
        const worker = createWorker();
        assignTask(worker, entry);
        return;
      }

      pendingQueue.push(entry);
    });};

    const batch = Batch.create<TResult>(this.#concurrency);
    const indexed: IndexedItemType<TMessage>[] = items.map((item, index) => { return { 'index': index, 'item': item }; });

    const allDispatchedPromises: Promise<TResult>[] = [];
    const results: TResult[] = [];

    try {
      for await (const chunk of batch.process(indexed, (entry) => {
        const result = dispatch(entry.item, entry.index);
        allDispatchedPromises.push(result);
        return result;
      })) {
        results.push(...chunk);
      }

      return results;
    } finally {
      shuttingDown = true;
      await Promise.allSettled(allDispatchedPromises);
      const workersToTerminate = [...liveWorkers];
      await Promise.allSettled(workersToTerminate.map((worker) => { const result = worker.terminate().catch(() => {}); return result; }));
    }
  }

  getSignal(): Signal {
    return this.#signal;
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  getHookErrorCount(): number {
    const result = this.#hookErrors.length;
    return result;
  }

  /** Returns a defensive copy of every hook failure recorded since construction. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = [...this.#hookErrors];
    return result;
  }

  static #noopUnregisterTimeout(): void {}

  static #assertExhaustiveEnvelope(_envelope: never): void {}

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

  /** Fires whenever the pool constructs a Worker — the initial per-run spin-up and any crash-triggered replacement alike. */
  protected onWorkerCreated(_threadId: number): void {}
}
