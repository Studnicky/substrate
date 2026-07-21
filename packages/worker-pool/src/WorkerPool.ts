/** Bounded node:worker_threads pool that fans work items across workers via a typed message envelope */

import { Batch } from '@studnicky/batch';
import { type HookInvocationError, HookInvoker } from '@studnicky/errors';
import { Signal } from '@studnicky/signal';
import { System } from '@studnicky/system';
import { Worker } from 'node:worker_threads';

import type { WorkerPoolConfigEntity } from './entities/WorkerPoolConfigEntity.js';
import type { WorkerTaskDispositionEntity } from './entities/WorkerTaskDispositionEntity.js';
import type { WorkerTaskIndexEntity } from './entities/WorkerTaskIndexEntity.js';
import type { WorkerErrorEnvelopeInterface } from './interfaces/WorkerErrorEnvelopeInterface.js';
import type { WorkerLogEnvelopeInterface } from './interfaces/WorkerLogEnvelopeInterface.js';
import type { WorkerPoolConfigInterface } from './interfaces/WorkerPoolConfigInterface.js';
import type { WorkerProgressEnvelopeInterface } from './interfaces/WorkerProgressEnvelopeInterface.js';
import type { WorkerResultEnvelopeInterface } from './interfaces/WorkerResultEnvelopeInterface.js';


interface WorkerPoolDepsInterface extends WorkerPoolConfigEntity.Type {
  'concurrency': Required<WorkerPoolConfigEntity.Type>['concurrency'];
  'signal': Signal;
}

interface IndexedItemInterface<TMessage> extends WorkerTaskIndexEntity.Type {
  readonly 'item': TMessage;
}

interface PendingEntryInterface<TMessage, TResult> extends WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'retried'?: WorkerTaskDispositionEntity.Type['retried'];
}

interface TaskContextInterface<TMessage, TResult>
  extends WorkerTaskDispositionEntity.Type, WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'unregisterTimeout': () => void;
}

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
  static readonly #OwnedHookInvoker = class WorkerPoolHookInvoker extends HookInvoker {
    protected override onHookError(_hookName: string, _cause: unknown): void {}
  };

  /**
   * Creates a new WorkerPool, defaulting `concurrency` to `System.optimalWorkerCount` and
   * `signal` to a fresh `Signal.create()` when omitted.
   *
   * @param config - `workerPath` is required; every other field defaults
   * @returns New WorkerPool instance
   */
  private static isConstructed<
    TMessage,
    TResult,
    TInstance extends WorkerPool<TMessage, TResult>
  >(
    value: unknown,
    constructor: Function & { readonly 'prototype': TInstance }
  ): value is TInstance {
    return value instanceof constructor;
  }

  static create<
    TMessage = unknown,
    TResult = unknown,
    TInstance extends WorkerPool<TMessage, TResult> = WorkerPool<TMessage, TResult>
  >(
    this: Function & { readonly 'prototype': TInstance },
    config: WorkerPoolConfigInterface
  ): TInstance {
    if (typeof config.workerPath !== 'string' || config.workerPath.length === 0) {
      throw new Error('WorkerPool: workerPath is required');
    }

    const result: unknown = Reflect.construct(this, [{
      'concurrency': config.concurrency ?? System.optimalWorkerCount,
      'signal': config.signal ?? Signal.create(),
      'timeoutMs': config.timeoutMs,
      'workerPath': config.workerPath
    }]);
    if (!WorkerPool.isConstructed(result, this)) {
      throw new TypeError('WorkerPool.create() must construct a WorkerPool instance');
    }
    return result;
  }

  readonly #workerPath: string;
  readonly #concurrency: number;
  readonly #timeoutMs: number | undefined;
  readonly #signal: Signal;

  protected readonly hooks: HookInvoker;

  protected constructor(deps: WorkerPoolDepsInterface) {
    this.hooks = new WorkerPool.#OwnedHookInvoker();
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
    const currentTaskByWorker = new Map<Worker, TaskContextInterface<TMessage, TResult>>();
    const liveWorkers = new Map<Worker, number>();
    const idleWorkers: Worker[] = [];
    const pendingQueue: PendingEntryInterface<TMessage, TResult>[] = [];
    let spawnedCount = 0;
    let shuttingDown = false;

    const settleTask = (worker: Worker, fn: (context: TaskContextInterface<TMessage, TResult>) => void): boolean => {
      const context = currentTaskByWorker.get(worker);
      if (context === undefined || context.settled) { return false; }
      context.settled = true;
      context.unregisterTimeout();
      currentTaskByWorker.delete(worker);
      fn(context);
      return true;
    };

    const freeWorker = async (worker: Worker): Promise<void> => {
      const next = pendingQueue.shift();
      if (next !== undefined) {
        await assignTask(worker, next);
        return;
      }
      idleWorkers.push(worker);
    };

    const assignTask = async (
      worker: Worker,
      entry: PendingEntryInterface<TMessage, TResult>
    ): Promise<void> => {
      let timeoutSignal: AbortSignal | undefined;
      try {
        timeoutSignal = this.#timeoutMs === undefined
          ? undefined
          : await this.#signal.compose({ 'deadlineMs': this.#timeoutMs });
      } catch (cause) {
        const error = cause instanceof Error
          ? cause
          : new Error('WorkerPool: task timeout signal composition failed', { 'cause': cause });
        entry.reject(error);
        await freeWorker(worker);
        return;
      }

      if (!liveWorkers.has(worker)) {
        const replacement = idleWorkers.pop();
        if (replacement === undefined) {
          pendingQueue.unshift(entry);
          return;
        }
        await assignTask(replacement, entry);
        return;
      }

      liveWorkers.set(worker, entry.index);

      const context: TaskContextInterface<TMessage, TResult> = {
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
          worker.terminate().catch((cause: unknown) => {
            const terminationError = cause instanceof Error
              ? cause
              : new Error('WorkerPool: worker termination failed', { 'cause': cause });
            this.hooks.invoke('onWorkerError', () => {
              const result = this.onWorkerError(terminationError, ctx.index);
              return result;
            });
          });
        });
      };

      context.unregisterTimeout = () => {
        timeoutSignal?.removeEventListener('abort', onTimeoutAbort);
      };

      currentTaskByWorker.set(worker, context);

      if (timeoutSignal?.aborted === true) {
        onTimeoutAbort();
        return;
      }

      timeoutSignal?.addEventListener('abort', onTimeoutAbort, { 'once': true });
      worker.postMessage(entry.item);
    };

    const handleResultEnvelope = async (worker: Worker, value: TResult): Promise<void> => {
      const settled = settleTask(worker, (ctx) => {
        ctx.resolve(value);
      });
      if (settled) {
        await freeWorker(worker);
      }
    };

    const handleErrorEnvelope = async (worker: Worker, message: string): Promise<void> => {
      const settled = settleTask(worker, (ctx) => {
        const error = new Error(message);
        this.hooks.invoke('onWorkerError', () => {
          const result = this.onWorkerError(error, ctx.index);
          return result;
        });
        ctx.reject(error);
      });
      if (settled) {
        await freeWorker(worker);
      }
    };

    const reportOperationFailure = (cause: unknown, index: number): void => {
      const error = cause instanceof Error
        ? cause
        : new Error('WorkerPool: asynchronous worker operation failed', { 'cause': cause });
      this.hooks.invoke('onWorkerError', () => {
        const result = this.onWorkerError(error, index);
        return result;
      });
    };

    const createWorker = (workerIndex: number): Worker => {
      const worker = new Worker(this.#workerPath);
      liveWorkers.set(worker, workerIndex);
      this.hooks.invoke('onWorkerCreated', () => {
        const result = this.onWorkerCreated(worker.threadId);
        return result;
      });

      worker.on('message', (envelope:
        | WorkerErrorEnvelopeInterface
        | WorkerLogEnvelopeInterface
        | WorkerProgressEnvelopeInterface
        | WorkerResultEnvelopeInterface<TResult>) => {
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
            handleErrorEnvelope(worker, envelope.error).catch((cause: unknown) => {
              reportOperationFailure(cause, context.index);
            });
            break;
          case 'log':
          case 'progress':
            break;
          case 'result':
            handleResultEnvelope(worker, envelope.value).catch((cause: unknown) => {
              reportOperationFailure(cause, context.index);
            });
            break;
          default:
            WorkerPool.#assertExhaustiveEnvelope(envelope);
        }
      });

      worker.on('error', (error: Error) => {
        const workerIndex = liveWorkers.get(worker) ?? -1;
        settleTask(worker, (ctx) => {
          this.hooks.invoke('onWorkerError', () => {
            const result = this.onWorkerError(error, ctx.index);
            return result;
          });
          ctx.reject(error);
        });
        worker.terminate().catch((cause: unknown) => {
          const terminationError = cause instanceof Error
            ? cause
            : new Error('WorkerPool: worker termination failed', { 'cause': cause });
          this.hooks.invoke('onWorkerError', () => {
            const result = this.onWorkerError(terminationError, workerIndex);
            return result;
          });
        });
      });

      worker.on('exit', (code: number) => {
        const workerIndex = liveWorkers.get(worker) ?? -1;
        liveWorkers.delete(worker);
        const idleIndex = idleWorkers.indexOf(worker);
        if (idleIndex !== -1) { idleWorkers.splice(idleIndex, 1); }

        const context = currentTaskByWorker.get(worker);

        if (context === undefined || context.settled) {
          if (!shuttingDown) {
            const replacement = createWorker(workerIndex);
            freeWorker(replacement).catch((cause: unknown) => {
              reportOperationFailure(cause, workerIndex);
            });
          }
          return;
        }

        currentTaskByWorker.delete(worker);

        // A worker that vanishes mid-task without a matching envelope is retried once on a
        // freshly spawned worker before being treated as a failure — this absorbs a worker
        // thread tearing itself down on its own between tasks, while a task that still fails
        // after the retry surfaces as a genuine rejection.
        if (!context.retried && !shuttingDown) {
          const replacement = createWorker(context.index);
          assignTask(replacement, {
            'index': context.index,
            'item': context.item,
            'reject': context.reject,
            'resolve': context.resolve,
            'retried': true
          }).catch((cause: unknown) => {
            reportOperationFailure(cause, context.index);
          });
          return;
        }

        context.reject(new Error(`WorkerPool: worker at index ${String(context.index)} exited with code ${String(code)} before returning a result`));

        if (!shuttingDown) {
          const replacement = createWorker(context.index);
          freeWorker(replacement).catch((cause: unknown) => {
            reportOperationFailure(cause, context.index);
          });
        }
      });

      return worker;
    };

    const dispatch = async (item: TMessage, index: number): Promise<TResult> => {
      const completion = Promise.withResolvers<TResult>();
      const entry: PendingEntryInterface<TMessage, TResult> = {
        'index': index,
        'item': item,
        'reject': completion.reject,
        'resolve': completion.resolve
      };

      const idleWorker = idleWorkers.pop();
      if (idleWorker !== undefined) {
        await assignTask(idleWorker, entry);
      } else if (spawnedCount < this.#concurrency) {
        spawnedCount += 1;
        const worker = createWorker(entry.index);
        await assignTask(worker, entry);
      } else {
        pendingQueue.push(entry);
      }

      return await completion.promise;
    };

    const batch = Batch.create<TResult>(this.#concurrency);
    const indexed: IndexedItemInterface<TMessage>[] = items.map((item, index) => {
      return { 'index': index, 'item': item };
    });

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
      const workersToTerminate = [...liveWorkers.entries()];
      const terminationResults = await Promise.allSettled(
        workersToTerminate.map(([worker]) => { const result = worker.terminate(); return result; })
      );
      terminationResults.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') { return; }
        const workerEntry = workersToTerminate[index];
        if (workerEntry === undefined) { return; }
        const terminationCause: unknown = outcome.reason;
        const terminationError = terminationCause instanceof Error
          ? terminationCause
          : new Error('WorkerPool: worker termination failed', { 'cause': terminationCause });
        this.hooks.invoke('onWorkerError', () => {
          const result = this.onWorkerError(terminationError, workerEntry[1]);
          return result;
        });
      });
    }
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  getHookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns detached diagnostics for every hook failure recorded since construction. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
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
  protected onMessage(
    _envelope:
      | WorkerErrorEnvelopeInterface
      | WorkerLogEnvelopeInterface
      | WorkerProgressEnvelopeInterface
      | WorkerResultEnvelopeInterface<TResult>,
    _index: number
  ): void {}

  /** Fires when a task exceeds its configured `timeoutMs`, immediately before the worker is terminated. */
  protected onWorkerTimeout(_index: number): void {}

  /** Fires when a task rejects or worker termination fails. */
  protected onWorkerError(_error: Error, _index: number): void {}

  /** Fires whenever the pool constructs a Worker — the initial per-run spin-up and any crash-triggered replacement alike. */
  protected onWorkerCreated(_threadId: number): void {}
}
