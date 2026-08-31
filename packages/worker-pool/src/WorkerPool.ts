import { Batch } from '@studnicky/batch';
/** Bounded node:worker_threads pool that fans work items across workers via a typed message envelope */
import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors';
import { MachineTerminatedError } from '@studnicky/fsm';
import { Signal } from '@studnicky/signal';
import { System } from '@studnicky/system/node';
import { Predicates } from '@studnicky/types';
import { Worker } from 'node:worker_threads';

import type { WorkerTaskIndexEntity } from './entities/WorkerTaskIndexEntity.js';
import type { FireOnWorkerErrorEffectInterface } from './interfaces/FireOnWorkerErrorEffectInterface.js';
import type { RetryGuardStateInterface } from './interfaces/RetryGuardStateInterface.js';
import type { TaskSettlementStateInterface } from './interfaces/TaskSettlementStateInterface.js';
import type { WorkerErrorEnvelopeInterface } from './interfaces/WorkerErrorEnvelopeInterface.js';
import type { WorkerLifecycleStateInterface } from './interfaces/WorkerLifecycleStateInterface.js';
import type { WorkerLogEnvelopeInterface } from './interfaces/WorkerLogEnvelopeInterface.js';
import type { WorkerPoolConfigInterface } from './interfaces/WorkerPoolConfigInterface.js';
import type { WorkerPoolInterface } from './interfaces/WorkerPoolInterface.js';
import type { WorkerProgressEnvelopeInterface } from './interfaces/WorkerProgressEnvelopeInterface.js';
import type { WorkerResultEnvelopeInterface } from './interfaces/WorkerResultEnvelopeInterface.js';

import { WorkerPoolConfigEntity } from './entities/WorkerPoolConfigEntity.js';
import { WorkerPoolError } from './errors/index.js';
import { RetryGuardMachine } from './RetryGuardMachine.js';
import { TaskSettlementMachine } from './TaskSettlementMachine.js';
import { WorkerFailureMachine } from './WorkerFailureMachine.js';
import { WorkerLifecycleMachine } from './WorkerLifecycleMachine.js';


interface WorkerPoolDepsInterface extends WorkerPoolConfigEntity.Type {
  'abortSignal': AbortSignal | undefined;
  'batchConcurrency': Required<WorkerPoolConfigEntity.Type>['batchConcurrency'];
  'concurrency': Required<WorkerPoolConfigEntity.Type>['concurrency'];
  'signal': Signal;
}

interface WorkerPoolConstructorInterface<TMessage, TResult, TInstance extends WorkerPool<TMessage, TResult>> extends Function {
  readonly 'prototype': TInstance;
}

interface IndexedItemInterface<TMessage> extends WorkerTaskIndexEntity.Type {
  readonly 'item': TMessage;
}

/** One worker's `@studnicky/fsm`-driven lifecycle state plus the index of the task it last ran. */
interface WorkerRecordInterface {
  'lastIndex': WorkerTaskIndexEntity.Type['index'];
  'lifecycleState': WorkerLifecycleStateInterface;
}

interface PendingEntryInterface<TMessage, TResult> extends WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'retryState'?: RetryGuardStateInterface;
}

interface TaskContextInterface<TMessage, TResult> extends WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'retryState': RetryGuardStateInterface;
  'settlementState': TaskSettlementStateInterface;
  'unregisterTimeout': () => void;
}

/**
 * Composes `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal` into a bounded
 * `node:worker_threads` pool: `run()` fans a list of work items across at most `concurrency`
 * concurrently-running workers. `batchConcurrency` controls how many items `Batch#process()`
 * admits into a scheduling window and defaults to `concurrency`. Workers are long-lived for the duration of a single `run()`
 * call — spun up as needed up to `concurrency`, reused across every item dispatched during
 * that call, and terminated only after every dispatched item has settled. Pool state (per-worker
 * lifecycle records, in-flight task tracking, the pending-item queue) lives entirely in `run()`'s
 * own scope, so two concurrent `run()` calls on the same instance never share or corrupt each
 * other's workers.
 *
 * Two invariants that used to be enforced by ad hoc booleans re-checked at each call site are now
 * formalized as `@studnicky/fsm` `StateMachine` subclasses, each instantiated fresh inside `run()`
 * alongside the rest of that call's closure-scoped state — never hoisted to an instance field:
 *
 * - A worker's `idle → busy → idle` / `→ dead` lifecycle — `WorkerLifecycleMachine`, replacing the
 *   `liveWorkers`/`idleWorkers` pair that used to be updated by hand at every call site that
 *   spawned, assigned, freed, or killed a worker. Each worker's `lifecycleState` lives on the
 *   `WorkerRecordInterface` this file keeps in `workerRecords`.
 * - A task settles (resolves, rejects, or times out) at most once — `TaskSettlementMachine`,
 *   driven through `settleTask()`, the only place a task's `settlementState` changes.
 * - A task is retried at most once after an unexpected worker exit — `RetryGuardMachine`, driven
 *   through the worker `'exit'` handler's unexpected-exit branch.
 *
 * `onWorkerError` fires from exactly one place — `reportWorkerError()`, which is the only caller of
 * `WorkerFailureMachine#transition()` and the only place that applies the resulting
 * `FireOnWorkerError` effect. Every failure path (pre-dispatch abort, an explicit `error` envelope,
 * an uncaught worker `'error'` event, a worker-termination failure following an abort/timeout, and
 * a worker-termination failure during final shutdown) constructs the failure as data and calls
 * `reportWorkerError()` — the hook itself never fires anywhere else.
 *
 * Every envelope a worker posts back — `log`, `progress`, `result`, or `error` — fires
 * `onMessage()`. A `'result'` envelope resolves that item; a `'error'` envelope, an uncaught
 * worker `'error'` event, an unexpected `'exit'`, or exceeding `timeoutMs` all reject it. A
 * worker that vanishes (`'exit'`) without a matching envelope while a task is still assigned
 * to it is retried once on a freshly spawned replacement before being treated as a failure —
 * this absorbs a worker thread tearing itself down on its own between tasks, while a task that
 * fails a second time still surfaces as a rejection.
 *
 * A task's composed timeout signal aborting mid-flight and the same signal already being
 * aborted before the task was ever posted to a worker are distinct conditions, reported
 * distinctly: the former is a genuine timeout, rejects with a message naming the timeout, and
 * fires `onWorkerTimeout()`; the latter never ran, rejects with a message stating that dispatch
 * never happened, and fires `onWorkerError()` instead. Both attach the signal's `reason`, if any,
 * as the rejection's `cause`.
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
 * const pool = WorkerPool.create({ workerPath: fileURLToPath(new URL('./worker.mjs', import.meta.url)) });
 * const results = await pool.run([1, 2, 3]);
 * ```
 */
export class WorkerPool<TMessage = unknown, TResult = unknown> implements WorkerPoolInterface<TMessage, TResult> {
  static readonly #OwnedHookInvoker = class WorkerPoolHookInvoker extends HookInvoker {
    protected override onHookError(_hookName: string): void {}
  };

  /**
   * Creates a new WorkerPool, defaulting `concurrency` to `System.optimalWorkerCount`,
   * `batchConcurrency` to `concurrency`, and `signal` to a fresh `Signal.create()` when omitted.
   *
   * @param config - `workerPath` is required; every other field defaults
   * @returns New WorkerPool instance
   */
  private static isConstructed<
    TMessage,
    TResult,
    TInstance extends WorkerPool<TMessage, TResult>
  >(
    value: object,
    constructor: WorkerPoolConstructorInterface<TMessage, TResult, TInstance>
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }

  static create<
    TMessage = unknown,
    TResult = unknown,
    TInstance extends WorkerPool<TMessage, TResult> = WorkerPool<TMessage, TResult>
  >(
    this: WorkerPoolConstructorInterface<TMessage, TResult, TInstance>,
    config: WorkerPoolConfigInterface
  ): TInstance {
    const {
      abortSignal,
      signal,
      ...serializableConfig
    } = config;
    let parsedConfig: WorkerPoolConfigEntity.Type;
    try {
      parsedConfig = WorkerPoolConfigEntity.intake(serializableConfig);
    } catch (cause) {
      throw new WorkerPoolError({
        'cause': cause,
        'code': 'workerPool.invalidConfig',
        'message': 'WorkerPool configuration is invalid'
      });
    }

    const concurrency = parsedConfig.concurrency ?? System.optimalWorkerCount;
    const result: unknown = Reflect.construct(this, [{
      'abortSignal': abortSignal,
      'batchConcurrency': parsedConfig.batchConcurrency ?? concurrency,
      'concurrency': concurrency,
      'signal': signal ?? Signal.create(),
      'timeoutMs': parsedConfig.timeoutMs,
      'workerPath': parsedConfig.workerPath
    }]);
    if (!Predicates.isObjectLike(result) || !WorkerPool.isConstructed(result, this)) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidConstruction',
        'message': 'WorkerPool.create() must construct a WorkerPool instance'
      });
    }
    return result;
  }

  readonly #workerPath: string;
  readonly #concurrency: number;
  readonly #batchConcurrency: number;
  readonly #timeoutMs: number | undefined;
  readonly #abortSignal: AbortSignal | undefined;
  readonly #signal: Signal;
  #closed = false;

  protected readonly hooks: HookInvoker;

  private static errorWithReason(message: string, reason: Error): Error {
    const result = reason === undefined ? RuntimeError.create(message) : RuntimeError.create(message, { 'cause': reason });
    return result;
  }

  protected constructor(deps: WorkerPoolDepsInterface) {
    this.hooks = new WorkerPool.#OwnedHookInvoker();
    this.#workerPath = deps.workerPath;
    this.#concurrency = deps.concurrency;
    this.#batchConcurrency = deps.batchConcurrency;
    this.#abortSignal = deps.abortSignal;
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
    if (this.#closed) {
      throw new WorkerPoolError({
        'code': 'workerPool.closed',
        'message': 'WorkerPool is closed'
      });
    }
    // Every FSM instance below is constructed fresh for this call and lives only in this
    // closure — never on `this` — preserving the documented invariant that two concurrent
    // `run()` calls on the same instance never share or corrupt each other's workers.
    const workerLifecycleMachine = new WorkerLifecycleMachine();
    const taskSettlementMachine = new TaskSettlementMachine();
    const retryGuardMachine = new RetryGuardMachine();
    const workerFailureMachine = new WorkerFailureMachine();
    let workerFailureState = workerFailureMachine.getInitialState();

    const currentTaskByWorker = new Map<Worker, TaskContextInterface<TMessage, TResult>>();
    const workerRecords = new Map<Worker, WorkerRecordInterface>();
    const idleWorkers: Worker[] = [];
    const pendingQueue: PendingEntryInterface<TMessage, TResult>[] = [];
    let spawnedCount = 0;
    let shuttingDown = false;

    const invokeWorkerErrorHook = (effect: FireOnWorkerErrorEffectInterface): void => {
      this.hooks.invoke('onWorkerError', () => {
        const result = this.onWorkerError(effect.error, effect.index);
        return result;
      });
    };

    // The single place `onWorkerError` fires — see the class doc. Every call site constructs the
    // failure as data and calls this method; the hook itself never fires anywhere else.
    const reportWorkerError = (error: Error, index: number): void => {
      const step = workerFailureMachine.transition(workerFailureState, {
        'error': error,
        'index': index,
        'type': 'workerFailure'
      });
      workerFailureState = step.state;
      const effectsLength = step.effects.length;
      for (let effectIndex = 0; effectIndex < effectsLength; effectIndex++) {
        const effect = step.effects.at(effectIndex);
        if (effect === undefined) { continue; }
        invokeWorkerErrorHook(effect);
      }
    };

    const reportOperationFailure = (cause: Error, index: number): void => {
      const error = Predicates.isError(cause)
        ? cause
        : RuntimeError.create('WorkerPool: asynchronous worker operation failed', { 'cause': cause });
      reportWorkerError(error, index);
    };

    /** Idempotent: a no-op if `worker` is already dead — `WorkerLifecycleMachine` makes that structural rather than a re-checked boolean. */
    const killWorker = (worker: Worker): void => {
      const record = workerRecords.get(worker);
      if (record === undefined) { return; }
      try {
        const step = workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'kill' });
        record.lifecycleState = step.state;
      } catch (cause) {
        if (!(cause instanceof MachineTerminatedError)) { throw cause; }
      }
      workerRecords.delete(worker);
      const idleIndex = idleWorkers.indexOf(worker);
      if (idleIndex !== -1) { idleWorkers.splice(idleIndex, 1); }
    };

    const settleTask = (worker: Worker, callback: (context: TaskContextInterface<TMessage, TResult>) => void): boolean => {
      const context = currentTaskByWorker.get(worker);
      if (context === undefined) { return false; }
      try {
        const step = taskSettlementMachine.transition(context.settlementState, { 'type': 'settle' });
        context.settlementState = step.state;
      } catch (cause) {
        if (cause instanceof MachineTerminatedError) { return false; }
        throw cause;
      }
      context.unregisterTimeout();
      currentTaskByWorker.delete(worker);
      callback(context);
      return true;
    };

    const freeWorker = async (worker: Worker): Promise<void> => {
      const next = pendingQueue.shift();
      if (next !== undefined) {
        await assignTask(worker, next);
        return;
      }
      const record = workerRecords.get(worker);
      if (record?.lifecycleState.variant === 'busy') {
        const step = workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'free' });
        record.lifecycleState = step.state;
      }
      idleWorkers.push(worker);
    };

    const assignTask = async (
      worker: Worker,
      entry: PendingEntryInterface<TMessage, TResult>
    ): Promise<void> => {
      let timeoutSignal: AbortSignal | undefined;
      try {
        const composeOptions: { 'deadlineMs'?: number; 'signal'?: AbortSignal; } = {};
        if (this.#timeoutMs !== undefined) {
          composeOptions.deadlineMs = this.#timeoutMs;
        }
        if (this.#abortSignal !== undefined) {
          composeOptions.signal = this.#abortSignal;
        }
        timeoutSignal = await this.#signal.compose(composeOptions);
      } catch (cause) {
        const error = Predicates.isError(cause)
          ? cause
          : RuntimeError.create('WorkerPool: task timeout signal composition failed', { 'cause': cause });
        entry.reject(error);
        await freeWorker(worker);
        return;
      }

      const record = workerRecords.get(worker);
      if (record === undefined) {
        const replacement = idleWorkers.pop();
        if (replacement === undefined) {
          pendingQueue.unshift(entry);
          return;
        }
        await assignTask(replacement, entry);
        return;
      }

      // A freshly created or pooled-idle worker is idle; a direct hand-off from freeWorker() is
      // already busy (it never re-enters the idle pool between tasks) — only the former is a
      // real transition.
      if (record.lifecycleState.variant === 'idle') {
        const step = workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'assign' });
        record.lifecycleState = step.state;
      }
      record.lastIndex = entry.index;

      const context: TaskContextInterface<TMessage, TResult> = {
        'index': entry.index,
        'item': entry.item,
        'reject': entry.reject,
        'resolve': entry.resolve,
        'retryState': entry.retryState ?? retryGuardMachine.getInitialState(),
        'settlementState': taskSettlementMachine.getInitialState(),
        'unregisterTimeout': WorkerPool.#noopUnregisterTimeout
      };

      const terminateAfterAbort = (taskContext: TaskContextInterface<TMessage, TResult>): void => {
        worker.terminate().catch((cause: Error) => {
          const terminationError = Predicates.isError(cause)
            ? cause
            : RuntimeError.create('WorkerPool: worker termination failed', { 'cause': cause });
          reportWorkerError(terminationError, taskContext.index);
        });
      };

      // The composed signal carries either the caller cancellation source or the task deadline.
      const onAbort = (): void => {
        settleTask(worker, (taskContext) => {
          if (this.#abortSignal?.aborted === true) {
            const error = WorkerPool.errorWithReason(
              `WorkerPool: task at index ${String(taskContext.index)} was cancelled`,
              timeoutSignal?.reason
            );
            reportWorkerError(error, taskContext.index);
            taskContext.reject(error);
            terminateAfterAbort(taskContext);
            return;
          }
          this.hooks.invoke('onWorkerTimeout', () => {
            const result = this.onWorkerTimeout(taskContext.index);
            return result;
          });
          taskContext.reject(WorkerPool.errorWithReason(
            `WorkerPool: task at index ${String(taskContext.index)} exceeded its timeout`,
            timeoutSignal?.reason
          ));
          terminateAfterAbort(taskContext);
        });
      };

      // Fires when the composed signal is already aborted before the item is ever posted to the
      // worker. The task never ran, so this is not a timeout: it fires onWorkerError, not
      // onWorkerTimeout, and the message states plainly that dispatch never happened.
      const onPreDispatchAbort = (): void => {
        settleTask(worker, (taskContext) => {
          const error = WorkerPool.errorWithReason(
            `WorkerPool: task at index ${String(taskContext.index)} was not dispatched because its signal was already aborted`,
            timeoutSignal?.reason
          );
          reportWorkerError(error, taskContext.index);
          taskContext.reject(error);
          terminateAfterAbort(taskContext);
        });
      };

      context.unregisterTimeout = () => {
        timeoutSignal?.removeEventListener('abort', onAbort);
      };

      currentTaskByWorker.set(worker, context);

      if (timeoutSignal?.aborted === true) {
        onPreDispatchAbort();
        return;
      }

      timeoutSignal?.addEventListener('abort', onAbort, { 'once': true });
      worker.postMessage(entry.item);
    };

    const handleResultEnvelope = async (worker: Worker, value: TResult): Promise<void> => {
      const settled = settleTask(worker, (context) => {
        context.resolve(value);
      });
      if (settled) {
        await freeWorker(worker);
      }
    };

    const handleErrorEnvelope = async (worker: Worker, message: string): Promise<void> => {
      const settled = settleTask(worker, (context) => {
        const error = RuntimeError.create(message);
        reportWorkerError(error, context.index);
        context.reject(error);
      });
      if (settled) {
        await freeWorker(worker);
      }
    };

    const createWorker = (workerIndex: number): Worker => {
      const worker = new Worker(this.#workerPath);
      workerRecords.set(worker, { 'lastIndex': workerIndex, 'lifecycleState': workerLifecycleMachine.getInitialState() });
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
            handleErrorEnvelope(worker, envelope.error).catch((cause: Error) => {
              reportOperationFailure(cause, context.index);
            });
            break;
          case 'log':
          case 'progress':
            break;
          case 'result':
            handleResultEnvelope(worker, envelope.value).catch((cause: Error) => {
              reportOperationFailure(cause, context.index);
            });
            break;
          default:
            WorkerPool.#assertExhaustiveEnvelope(envelope);
        }
      });

      worker.on('error', (error: Error) => {
        const record = workerRecords.get(worker);
        const workerIndex2 = record?.lastIndex ?? -1;
        settleTask(worker, (context) => {
          reportWorkerError(error, context.index);
          context.reject(error);
        });
        worker.terminate().catch((cause: Error) => {
          const terminationError = Predicates.isError(cause)
            ? cause
            : RuntimeError.create('WorkerPool: worker termination failed', { 'cause': cause });
          reportWorkerError(terminationError, workerIndex2);
        });
      });

      worker.on('exit', (code: number) => {
        const record = workerRecords.get(worker);
        const workerIndex3 = record?.lastIndex ?? -1;
        killWorker(worker);

        const context = currentTaskByWorker.get(worker);

        if (context === undefined || context.settlementState.variant === 'settled') {
          if (!shuttingDown) {
            const replacement = createWorker(workerIndex3);
            freeWorker(replacement).catch((cause: Error) => {
              reportOperationFailure(cause, workerIndex3);
            });
          }
          return;
        }

        currentTaskByWorker.delete(worker);

        // A worker that vanishes mid-task without a matching envelope is retried once on a
        // freshly spawned worker before being treated as a failure — this absorbs a worker
        // thread tearing itself down on its own between tasks, while a task that still fails
        // after the retry surfaces as a genuine rejection. RetryGuardMachine makes "retry once"
        // structural: a second unexpected exit for the same task lands on isTerminated() and
        // throws MachineTerminatedError instead of re-checking a mutable flag.
        let retriedState: RetryGuardStateInterface | undefined;
        if (!shuttingDown) {
          try {
            const step = retryGuardMachine.transition(context.retryState, { 'type': 'requestRetry' });
            retriedState = step.state;
          } catch (cause) {
            if (!(cause instanceof MachineTerminatedError)) { throw cause; }
          }
        }

        if (retriedState !== undefined) {
          const replacement = createWorker(context.index);
          assignTask(replacement, {
            'index': context.index,
            'item': context.item,
            'reject': context.reject,
            'resolve': context.resolve,
            'retryState': retriedState
          }).catch((cause: Error) => {
            reportOperationFailure(cause, context.index);
          });
          return;
        }

        context.reject(RuntimeError.create(`WorkerPool: worker at index ${String(context.index)} exited with code ${String(code)} before returning a result`));

        if (!shuttingDown) {
          const replacement = createWorker(context.index);
          freeWorker(replacement).catch((cause: Error) => {
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

    const batch = Batch.create<TResult>(this.#batchConcurrency);
    const indexed: IndexedItemInterface<TMessage>[] = items.map((item, index) => {
      return { 'index': index, 'item': item };
    });

    const allDispatchedPromises: Promise<TResult>[] = [];
    const results: TResult[] = [];

    function dispatchAndTrack(entry: IndexedItemInterface<TMessage>): Promise<TResult> {
      const result = dispatch(entry.item, entry.index);
      allDispatchedPromises.push(result);
      return result;
    }

    try {
      for await (const chunk of batch.process(indexed, dispatchAndTrack)) {
        results.push(...chunk);
      }

      return results;
    } finally {
      shuttingDown = true;
      await Promise.allSettled(allDispatchedPromises);
      const workersToTerminate = [...workerRecords.entries()].map(
        ([worker, record]) => {return [worker, record.lastIndex] as const;}
      );
      const terminationResults = await Promise.allSettled(
        workersToTerminate.map(([worker]) => { const result = worker.terminate(); return result; })
      );
      terminationResults.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') { return; }
        const workerEntry = workersToTerminate.at(index);
        if (workerEntry === undefined) { return; }
        const terminationCause: unknown = outcome.reason;
        const terminationError = Predicates.isError(terminationCause)
          ? terminationCause
          : RuntimeError.create('WorkerPool: worker termination failed', { 'cause': terminationCause });
        const [, workerIndex] = workerEntry;
        reportWorkerError(terminationError, workerIndex);
      });
    }
  }

  /** Prevents future runs. Workers are scoped to each completed run and are already terminated. */
  public close(): Promise<void> {
    this.#closed = true;
    const result = Promise.resolve();
    return result;
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  getHookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns detached diagnostics for every hook failure recorded since construction. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = [...this.hooks.getHookErrors()];
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
