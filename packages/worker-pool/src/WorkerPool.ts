import type { ComposedSignalInterface } from '@studnicky/signal/interfaces';

import { Batch } from '@studnicky/batch/node';
/** Bounded node:worker_threads pool that fans work items across workers via a typed message envelope */
import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { MachineTerminatedError } from '@studnicky/fsm/node';
import { Signal } from '@studnicky/signal/node';
import { System } from '@studnicky/system/node';
import { Predicates } from '@studnicky/types/node';
import { Worker } from 'node:worker_threads';

import type { RetryGuardStateEntity } from './entities/RetryGuardStateEntity.js';
import type { TaskSettlementStateEntity } from './entities/TaskSettlementStateEntity.js';
import type { WorkerErrorEnvelopeEntity } from './entities/WorkerErrorEnvelopeEntity.js';
import type { WorkerFailureStateEntity } from './entities/WorkerFailureStateEntity.js';
import type { WorkerLifecycleStateEntity } from './entities/WorkerLifecycleStateEntity.js';
import type { WorkerLogEnvelopeEntity } from './entities/WorkerLogEnvelopeEntity.js';
import type { WorkerProgressEnvelopeEntity } from './entities/WorkerProgressEnvelopeEntity.js';
import type { FireOnWorkerErrorEffectInterface } from './interfaces/FireOnWorkerErrorEffectInterface.js';
import type { WorkerPoolConfigInterface } from './interfaces/WorkerPoolConfigInterface.js';
import type { WorkerPoolInterface } from './interfaces/WorkerPoolInterface.js';
import type { WorkerResultEnvelopeInterface } from './interfaces/WorkerResultEnvelopeInterface.js';

import { WorkerPoolConfigEntity } from './entities/WorkerPoolConfigEntity.js';
import { WorkerTaskIndexEntity } from './entities/WorkerTaskIndexEntity.js';
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

/** Tracks whether a worker has finished starting — `ready` flips true on `'online'`, letting a reused idle worker skip the boot wait entirely. */
interface WorkerBootRecordInterface {
  'promise': Promise<void>;
  'ready': boolean;
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
  'lifecycleState': WorkerLifecycleStateEntity.Type;
}

interface PendingEntryInterface<TMessage, TResult> extends WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'retryState'?: RetryGuardStateEntity.Type;
}

interface TaskContextInterface<TMessage, TResult> extends WorkerTaskIndexEntity.Type {
  'item': TMessage;
  'reject': (error: Error) => void;
  'resolve': (value: TResult) => void;
  'retryState': RetryGuardStateEntity.Type;
  'settlementState': TaskSettlementStateEntity.Type;
  'unregisterTimeout': () => void;
}

interface TaskCancellationBindingInterface {
  readonly 'controller': AbortController;
  readonly 'release': () => void;
}

/**
 * Every piece of a single `run()` call's bookkeeping — worker records, in-flight tasks, the
 * pending queue, and each FSM's current state. Constructed fresh per `run()` call and passed
 * explicitly to every step method below; never stored on the `WorkerPool` instance itself, so
 * two concurrent `run()` calls never share or corrupt each other's workers.
 */
class WorkerPoolRunState<TMessage, TResult> {
  public readonly 'allDispatchedPromises': Promise<TResult>[] = [];
  public readonly 'currentTaskByWorker' = new Map<Worker, TaskContextInterface<TMessage, TResult>>();
  public readonly 'idleWorkers': Worker[] = [];
  public readonly 'pendingQueue': PendingEntryInterface<TMessage, TResult>[] = [];
  public readonly 'retryGuardMachine' = new RetryGuardMachine();
  public 'shuttingDown' = false;
  public 'spawnedCount' = 0;
  public readonly 'taskSettlementMachine' = new TaskSettlementMachine();
  public readonly 'workerBoot' = new Map<Worker, WorkerBootRecordInterface>();
  public readonly 'workerFailureMachine' = new WorkerFailureMachine();
  public 'workerFailureState': WorkerFailureStateEntity.Type;
  public readonly 'workerLifecycleMachine' = new WorkerLifecycleMachine();
  public readonly 'workerRecords' = new Map<Worker, WorkerRecordInterface>();

  public constructor() {
    this.workerFailureState = this.workerFailureMachine.getInitialState();
  }
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
 * `timeoutMs` bounds task execution only: its clock starts once a worker's `'online'` event
 * fires, immediately before the item is posted, so worker startup latency never eats into it.
 * The optional, independent `startupTimeoutMs` bounds that startup phase instead — a worker
 * that fails to start within it rejects through `onWorkerError()`, never `onWorkerTimeout()`.
 * The caller's `abortSignal` is composed exactly once per task; both deadlines derive from that
 * single composition through a task-owned `AbortController`, so each task holds exactly one
 * listener on the caller's signal for its whole lifetime.
 *
 * A task's timeout signal aborting mid-flight and the same signal already being aborted before
 * the task was ever posted to a worker are distinct conditions, reported distinctly: the former
 * is a genuine timeout, rejects with a message naming the timeout, and fires `onWorkerTimeout()`;
 * the latter never ran, rejects with a message stating that dispatch never happened, and fires
 * `onWorkerError()` instead. Both attach the signal's `reason`, if any, as the rejection's `cause`.
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
      'startupTimeoutMs': parsedConfig.startupTimeoutMs,
      'timeoutMs': parsedConfig.timeoutMs,
      'workerPath': parsedConfig.workerPath
    }]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf(result, this)) {
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
  readonly #startupTimeoutMs: number | undefined;
  readonly #abortSignal: AbortSignal | undefined;
  readonly #signal: Signal;
  #closed = false;

  protected readonly hooks: HookInvoker;

  private static errorWithReason(message: string, reason: Error): Error {
    const result = reason === undefined ? RuntimeError.create(message) : RuntimeError.create(message, { 'cause': reason });
    return result;
  }

  /** An array position or worker id earns its brand via a positive guard before entering task/worker state. */
  private static validateIndex(index: number): WorkerTaskIndexEntity.Type['index'] {
    const candidate = { 'index': index };
    if (!WorkerTaskIndexEntity.validate(candidate)) {
      throw RuntimeError.create('internal error: invalid task index');
    }
    return candidate.index;
  }

  /** True only for the reason `AbortSignal.timeout()` itself produces — a genuinely elapsed deadline, never a caller abort or a pre-aborted signal. */
  private static isTimeoutReason(reason: Error): boolean {
    const result = reason instanceof DOMException && reason.name === 'TimeoutError';
    return result;
  }

  /** Builds the distinct, programmatically-identifiable error a worker's startup phase rejects with — never the task-timeout message. */
  private static startupError(index: number, reason: Error, abortSignal: AbortSignal | undefined): Error {
    if (abortSignal?.aborted === true) {
      const result = WorkerPool.errorWithReason(`WorkerPool: task at index ${String(index)} was cancelled before its worker finished starting`, reason);
      return result;
    }
    if (WorkerPool.isTimeoutReason(reason)) {
      const result = WorkerPool.errorWithReason(`WorkerPool: worker for task at index ${String(index)} did not finish starting within its startup timeout`, reason);
      return result;
    }
    const result = WorkerPool.errorWithReason(`WorkerPool: task at index ${String(index)} was not dispatched because its signal was already aborted`, reason);
    return result;
  }

  protected constructor(deps: WorkerPoolDepsInterface) {
    this.hooks = new WorkerPool.#OwnedHookInvoker();
    this.#workerPath = deps.workerPath;
    this.#concurrency = deps.concurrency;
    this.#batchConcurrency = deps.batchConcurrency;
    this.#abortSignal = deps.abortSignal;
    this.#timeoutMs = deps.timeoutMs;
    this.#startupTimeoutMs = deps.startupTimeoutMs;
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
    this.#assertOpen();

    // Every FSM instance and per-run bookkeeping structure lives only in `state`, itself scoped
    // to this call — never hoisted to `this` — preserving the documented invariant that two
    // concurrent `run()` calls on the same instance never share or corrupt each other's workers.
    const state = new WorkerPoolRunState<TMessage, TResult>();
    const batch = Batch.create<TResult>(this.#batchConcurrency);
    const indexed: IndexedItemInterface<TMessage>[] = items.map((item, index) => {
      return { 'index': WorkerPool.validateIndex(index), 'item': item };
    });
    const results: TResult[] = [];

    try {
      for await (const chunk of batch.process(indexed, (entry) => {
        const result = this.#dispatchAndTrack(state, entry);
        return result;
      })) {
        results.push(...chunk);
      }

      return results;
    } finally {
      await this.#shutdownRun(state);
    }
  }

  #assertOpen(): void {
    if (this.#closed) {
      throw new WorkerPoolError({
        'code': 'workerPool.closed',
        'message': 'WorkerPool is closed'
      });
    }
  }

  #invokeWorkerErrorHook(effect: FireOnWorkerErrorEffectInterface): void {
    this.hooks.invoke('onWorkerError', () => {
      const result = this.onWorkerError(effect.error, effect.index);
      return result;
    });
  }

  /** The single place `onWorkerError` fires — see the class doc. Every failure path constructs the error as data and calls this. */
  #reportWorkerError(state: WorkerPoolRunState<TMessage, TResult>, error: Error, index: number): void {
    const step = state.workerFailureMachine.transition(state.workerFailureState, {
      'error': error,
      'index': WorkerPool.validateIndex(index),
      'type': 'workerFailure'
    });
    state.workerFailureState = step.state;
    const effectsLength = step.effects.length;
    for (let effectIndex = 0; effectIndex < effectsLength; effectIndex++) {
      const effect = step.effects.at(effectIndex);
      if (effect === undefined) { continue; }
      this.#invokeWorkerErrorHook(effect);
    }
  }

  #reportOperationFailure(state: WorkerPoolRunState<TMessage, TResult>, cause: Error, index: number): void {
    const error = Predicates.isError(cause)
      ? cause
      : RuntimeError.create('WorkerPool: asynchronous worker operation failed', { 'cause': cause });
    this.#reportWorkerError(state, error, index);
  }

  #reportTerminationFailure(state: WorkerPoolRunState<TMessage, TResult>, cause: unknown, index: number): void {
    const terminationError = Predicates.isError(cause)
      ? cause
      : RuntimeError.create('WorkerPool: worker termination failed', { 'cause': cause });
    this.#reportWorkerError(state, terminationError, index);
  }

  /** Idempotent: a no-op if `worker` is already dead — `WorkerLifecycleMachine` makes that structural rather than a re-checked boolean. */
  #killWorker(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker): void {
    const record = state.workerRecords.get(worker);
    if (record === undefined) { return; }
    try {
      const step = state.workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'kill' });
      record.lifecycleState = step.state;
    } catch (cause) {
      if (!(cause instanceof MachineTerminatedError)) { throw cause; }
    }
    state.workerRecords.delete(worker);
    state.workerBoot.delete(worker);
    const idleIndex = state.idleWorkers.indexOf(worker);
    if (idleIndex !== -1) { state.idleWorkers.splice(idleIndex, 1); }
  }

  /**
   * Awaits a worker's `'online'` event, bounded by `startupTimeoutMs` and `taskCancelSignal`.
   * A worker already reporting online returns immediately without building a signal.
   */
  async #ensureWorkerBooted(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    index: number,
    taskCancelSignal: AbortSignal
  ): Promise<void> {
    const boot = state.workerBoot.get(worker);
    if (boot === undefined || boot.ready) { return; }

    const startupSignal = this.#startupTimeoutMs !== undefined
      ? AbortSignal.any([taskCancelSignal, AbortSignal.timeout(this.#startupTimeoutMs)])
      : taskCancelSignal;
    if (startupSignal.aborted) {
      throw WorkerPool.startupError(index, startupSignal.reason, this.#abortSignal);
    }

    const startupAborted = Promise.withResolvers<never>();
    const onStartupAbort = (): void => {
      startupAborted.reject(WorkerPool.startupError(index, startupSignal.reason, this.#abortSignal));
    };
    startupSignal.addEventListener('abort', onStartupAbort, { 'once': true });
    try {
      await Promise.race([boot.promise, startupAborted.promise]);
    } finally {
      startupSignal.removeEventListener('abort', onStartupAbort);
    }
  }

  #settleTask(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    callback: (context: TaskContextInterface<TMessage, TResult>) => void
  ): boolean {
    const context = state.currentTaskByWorker.get(worker);
    if (context === undefined) { return false; }
    try {
      const step = state.taskSettlementMachine.transition(context.settlementState, { 'type': 'settle' });
      context.settlementState = step.state;
    } catch (cause) {
      if (cause instanceof MachineTerminatedError) { return false; }
      throw cause;
    }
    context.unregisterTimeout();
    state.currentTaskByWorker.delete(worker);
    callback(context);
    return true;
  }

  async #freeWorker(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker): Promise<void> {
    const next = state.pendingQueue.shift();
    if (next !== undefined) {
      await this.#assignTask(state, worker, next);
      return;
    }
    const record = state.workerRecords.get(worker);
    if (record === undefined) { return; }
    if (record.lifecycleState.variant === 'busy') {
      const step = state.workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'free' });
      record.lifecycleState = step.state;
    }
    state.idleWorkers.push(worker);
  }

  /** Kills an unstartable worker, reports the failure, and — unless shutting down — spawns its replacement onto the pending queue. */
  async #abandonUnbootedWorker(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    entry: PendingEntryInterface<TMessage, TResult>,
    error: Error
  ): Promise<void> {
    this.#reportWorkerError(state, error, entry.index);
    entry.reject(error);
    this.#killWorker(state, worker);
    worker.terminate().catch((cause: Error) => {
      this.#reportTerminationFailure(state, cause, entry.index);
    });
    if (state.shuttingDown || state.pendingQueue.length === 0) { return; }
    const replacement = this.#createWorker(state, entry.index);
    await this.#freeWorker(state, replacement);
  }

  /** No worker record — hand off to an idle worker if one exists, otherwise queue for later dispatch. */
  async #assignToIdleReplacementOrQueue(
    state: WorkerPoolRunState<TMessage, TResult>,
    entry: PendingEntryInterface<TMessage, TResult>
  ): Promise<void> {
    const replacement = state.idleWorkers.pop();
    if (replacement === undefined) {
      state.pendingQueue.unshift(entry);
      return;
    }
    await this.#assignTask(state, replacement, entry);
  }

  /** Composes the caller's cancellation source once per task; on failure the entry is rejected and the worker freed. */
  async #composeTaskCancellationSignal(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    entry: PendingEntryInterface<TMessage, TResult>
  ): Promise<ComposedSignalInterface | undefined> {
    const composeOptions: { 'signal'?: AbortSignal; } = {};
    if (this.#abortSignal !== undefined) {
      composeOptions.signal = this.#abortSignal;
    }
    try {
      const result = await this.#signal.compose(composeOptions);
      return result;
    } catch (cause) {
      const error = Predicates.isError(cause)
        ? cause
        : RuntimeError.create('WorkerPool: task cancellation signal composition failed', { 'cause': cause });
      entry.reject(error);
      await this.#freeWorker(state, worker);
      return undefined;
    }
  }

  /** The task's only listener on the caller-derived signal; both the startup and task deadlines derive from `controller.signal`. */
  #bindTaskCancellation(composed: ComposedSignalInterface): TaskCancellationBindingInterface {
    const cancellationSignal = composed.signal;
    const controller = new AbortController();
    const onCancellationAbort = (): void => {
      controller.abort(cancellationSignal.reason);
    };
    if (cancellationSignal.aborted) {
      onCancellationAbort();
    } else {
      cancellationSignal.addEventListener('abort', onCancellationAbort, { 'once': true });
    }
    const release = (): void => {
      cancellationSignal.removeEventListener('abort', onCancellationAbort);
      composed.dispose();
    };
    return { 'controller': controller, 'release': release };
  }

  /** `timeoutMs` bounds task execution only: the clock starts after boot, before the post. */
  #buildTaskTimeoutSignal(taskCancelSignal: AbortSignal): AbortSignal {
    const result = this.#timeoutMs !== undefined
      ? AbortSignal.any([taskCancelSignal, AbortSignal.timeout(this.#timeoutMs)])
      : taskCancelSignal;
    return result;
  }

  #buildTaskContext(
    state: WorkerPoolRunState<TMessage, TResult>,
    entry: PendingEntryInterface<TMessage, TResult>
  ): TaskContextInterface<TMessage, TResult> {
    return {
      'index': entry.index,
      'item': entry.item,
      'reject': entry.reject,
      'resolve': entry.resolve,
      'retryState': entry.retryState ?? state.retryGuardMachine.getInitialState(),
      'settlementState': state.taskSettlementMachine.getInitialState(),
      'unregisterTimeout': WorkerPool.#noopUnregisterTimeout
    };
  }

  #terminateAfterAbort(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    taskContext: TaskContextInterface<TMessage, TResult>
  ): void {
    worker.terminate().catch((cause: Error) => {
      this.#reportTerminationFailure(state, cause, taskContext.index);
    });
  }

  /** The composed signal carries either the caller cancellation source or the task deadline. */
  #handleTaskAbort(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker, timeoutSignal: AbortSignal): void {
    this.#settleTask(state, worker, (taskContext) => {
      if (this.#abortSignal?.aborted === true) {
        const error = WorkerPool.errorWithReason(
          `WorkerPool: task at index ${String(taskContext.index)} was cancelled`,
          timeoutSignal.reason
        );
        this.#reportWorkerError(state, error, taskContext.index);
        taskContext.reject(error);
        this.#terminateAfterAbort(state, worker, taskContext);
        return;
      }
      this.hooks.invoke('onWorkerTimeout', () => {
        const result = this.onWorkerTimeout(taskContext.index);
        return result;
      });
      taskContext.reject(WorkerPool.errorWithReason(
        `WorkerPool: task at index ${String(taskContext.index)} exceeded its timeout`,
        timeoutSignal.reason
      ));
      this.#terminateAfterAbort(state, worker, taskContext);
    });
  }

  /** Already aborted before dispatch: not a timeout, so this fires onWorkerError, not onWorkerTimeout. */
  #handlePreDispatchAbort(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker, timeoutSignal: AbortSignal): void {
    this.#settleTask(state, worker, (taskContext) => {
      const error = WorkerPool.errorWithReason(
        `WorkerPool: task at index ${String(taskContext.index)} was not dispatched because its signal was already aborted`,
        timeoutSignal.reason
      );
      this.#reportWorkerError(state, error, taskContext.index);
      taskContext.reject(error);
      this.#terminateAfterAbort(state, worker, taskContext);
    });
  }

  async #assignTask(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    entry: PendingEntryInterface<TMessage, TResult>
  ): Promise<void> {
    const record = state.workerRecords.get(worker);
    if (record === undefined) {
      await this.#assignToIdleReplacementOrQueue(state, entry);
      return;
    }

    // A freeWorker() hand-off arrives already busy; only a from-idle worker performs a real transition.
    if (record.lifecycleState.variant === 'idle') {
      const step = state.workerLifecycleMachine.transition(record.lifecycleState, { 'type': 'assign' });
      record.lifecycleState = step.state;
    }
    record.lastIndex = entry.index;

    const cancellationSignal = await this.#composeTaskCancellationSignal(state, worker, entry);
    if (cancellationSignal === undefined) {
      return;
    }

    const cancellation = this.#bindTaskCancellation(cancellationSignal);

    try {
      await this.#ensureWorkerBooted(state, worker, entry.index, cancellation.controller.signal);
    } catch (cause) {
      cancellation.release();
      const error = Predicates.isError(cause)
        ? cause
        : RuntimeError.create('WorkerPool: worker startup failed', { 'cause': cause });
      await this.#abandonUnbootedWorker(state, worker, entry, error);
      return;
    }

    const timeoutSignal = this.#buildTaskTimeoutSignal(cancellation.controller.signal);
    const context = this.#buildTaskContext(state, entry);

    const onAbort = (): void => { this.#handleTaskAbort(state, worker, timeoutSignal); };
    context.unregisterTimeout = () => {
      timeoutSignal.removeEventListener('abort', onAbort);
      cancellation.release();
    };

    state.currentTaskByWorker.set(worker, context);

    if (timeoutSignal.aborted) {
      this.#handlePreDispatchAbort(state, worker, timeoutSignal);
      return;
    }

    timeoutSignal.addEventListener('abort', onAbort, { 'once': true });
    worker.postMessage(entry.item);
  }

  async #handleResultEnvelope(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker, value: TResult): Promise<void> {
    const settled = this.#settleTask(state, worker, (context) => {
      context.resolve(value);
    });
    if (settled) {
      await this.#freeWorker(state, worker);
    }
  }

  async #handleErrorEnvelope(state: WorkerPoolRunState<TMessage, TResult>, worker: Worker, message: string): Promise<void> {
    const settled = this.#settleTask(state, worker, (context) => {
      const error = RuntimeError.create(message);
      this.#reportWorkerError(state, error, context.index);
      context.reject(error);
    });
    if (settled) {
      await this.#freeWorker(state, worker);
    }
  }

  #handleWorkerMessage(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    envelope: WorkerErrorEnvelopeEntity.Type | WorkerLogEnvelopeEntity.Type | WorkerProgressEnvelopeEntity.Type | WorkerResultEnvelopeInterface<TResult>
  ): void {
    const context = state.currentTaskByWorker.get(worker);
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
        this.#handleErrorEnvelope(state, worker, envelope.error).catch((cause: Error) => {
          this.#reportOperationFailure(state, cause, context.index);
        });
        break;
      case 'log':
      case 'progress':
        break;
      case 'result':
        this.#handleResultEnvelope(state, worker, envelope.value).catch((cause: Error) => {
          this.#reportOperationFailure(state, cause, context.index);
        });
        break;
      default:
        WorkerPool.#assertExhaustiveEnvelope(envelope);
    }
  }

  #handleWorkerError(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    error: Error,
    rejectUnbootedFailure: (error: Error) => void
  ): void {
    const record = state.workerRecords.get(worker);
    const workerIndex = record?.lastIndex ?? -1;
    // An errored worker must never be handed a later task: without this, a worker that errors
    // while idle stays listed as assignable until its 'exit' event lands.
    this.#killWorker(state, worker);
    rejectUnbootedFailure(RuntimeError.create(`WorkerPool: worker at index ${String(workerIndex)} emitted an error before finishing startup`, { 'cause': error }));
    this.#settleTask(state, worker, (context) => {
      this.#reportWorkerError(state, error, context.index);
      context.reject(error);
    });
    worker.terminate().catch((cause: Error) => {
      this.#reportTerminationFailure(state, cause, workerIndex);
    });
  }

  /** Only replace when work is queued — an idle replacement just adds a stray terminate() call. */
  #spawnReplacementIfQueued(state: WorkerPoolRunState<TMessage, TResult>, index: number): void {
    if (state.shuttingDown || state.pendingQueue.length === 0) { return; }
    const replacement = this.#createWorker(state, index);
    this.#freeWorker(state, replacement).catch((cause: Error) => {
      this.#reportOperationFailure(state, cause, index);
    });
  }

  /** `RetryGuardMachine` makes "retry once" structural: a second attempt throws `MachineTerminatedError`. */
  #requestTaskRetry(
    state: WorkerPoolRunState<TMessage, TResult>,
    context: TaskContextInterface<TMessage, TResult>
  ): RetryGuardStateEntity.Type | undefined {
    if (state.shuttingDown) { return undefined; }
    try {
      const step = state.retryGuardMachine.transition(context.retryState, { 'type': 'requestRetry' });
      return step.state;
    } catch (cause) {
      if (!(cause instanceof MachineTerminatedError)) { throw cause; }
      return undefined;
    }
  }

  #retryTaskOnReplacement(
    state: WorkerPoolRunState<TMessage, TResult>,
    context: TaskContextInterface<TMessage, TResult>,
    retriedState: RetryGuardStateEntity.Type
  ): void {
    const replacement = this.#createWorker(state, context.index);
    this.#assignTask(state, replacement, {
      'index': context.index,
      'item': context.item,
      'reject': context.reject,
      'resolve': context.resolve,
      'retryState': retriedState
    }).catch((cause: Error) => {
      this.#reportOperationFailure(state, cause, context.index);
    });
  }

  /**
   * A worker that vanishes mid-task without a matching envelope is retried once on a freshly
   * spawned worker before being treated as a failure — see `#requestTaskRetry`.
   */
  #handleWorkerExit(
    state: WorkerPoolRunState<TMessage, TResult>,
    worker: Worker,
    code: number,
    rejectUnbootedFailure: (error: Error) => void
  ): void {
    const record = state.workerRecords.get(worker);
    const workerIndex = record?.lastIndex ?? -1;
    rejectUnbootedFailure(RuntimeError.create(`WorkerPool: worker at index ${String(workerIndex)} exited with code ${String(code)} before finishing startup`));
    this.#killWorker(state, worker);

    const context = state.currentTaskByWorker.get(worker);

    if (context === undefined || context.settlementState.variant === 'settled') {
      this.#spawnReplacementIfQueued(state, workerIndex);
      return;
    }

    state.currentTaskByWorker.delete(worker);

    const retriedState = this.#requestTaskRetry(state, context);

    if (retriedState !== undefined) {
      this.#retryTaskOnReplacement(state, context, retriedState);
      return;
    }

    context.reject(RuntimeError.create(`WorkerPool: worker at index ${String(context.index)} exited with code ${String(code)} before returning a result`));
    this.#spawnReplacementIfQueued(state, context.index);
  }

  #createWorker(state: WorkerPoolRunState<TMessage, TResult>, workerIndex: number): Worker {
    const worker = new Worker(this.#workerPath);
    state.workerRecords.set(worker, { 'lastIndex': WorkerPool.validateIndex(workerIndex), 'lifecycleState': state.workerLifecycleMachine.getInitialState() });
    this.hooks.invoke('onWorkerCreated', () => {
      const result = this.onWorkerCreated(worker.threadId);
      return result;
    });

    const bootResolvers = Promise.withResolvers<void>();
    // A worker that dies before assignment has no `ensureWorkerBooted` caller to observe
    // this rejection, so it is swallowed here.
    bootResolvers.promise.catch(() => {});
    const bootRecord: WorkerBootRecordInterface = { 'promise': bootResolvers.promise, 'ready': false };
    let bootSettled = false;
    state.workerBoot.set(worker, bootRecord);
    worker.once('online', () => {
      bootSettled = true;
      bootRecord.ready = true;
      bootResolvers.resolve();
    });
    // A worker dying before online rejects `ensureWorkerBooted`'s wait directly.
    const rejectUnbootedFailure = (error: Error): void => {
      if (bootSettled) { return; }
      bootSettled = true;
      bootResolvers.reject(error);
    };

    worker.on('message', (envelope:
      | WorkerErrorEnvelopeEntity.Type
      | WorkerLogEnvelopeEntity.Type
      | WorkerProgressEnvelopeEntity.Type
      | WorkerResultEnvelopeInterface<TResult>) => {
      this.#handleWorkerMessage(state, worker, envelope);
    });

    worker.on('error', (error: Error) => {
      this.#handleWorkerError(state, worker, error, rejectUnbootedFailure);
    });

    worker.on('exit', (code: number) => {
      this.#handleWorkerExit(state, worker, code, rejectUnbootedFailure);
    });

    return worker;
  }

  async #dispatch(state: WorkerPoolRunState<TMessage, TResult>, item: TMessage, index: number): Promise<TResult> {
    const completion = Promise.withResolvers<TResult>();
    const entry: PendingEntryInterface<TMessage, TResult> = {
      'index': WorkerPool.validateIndex(index),
      'item': item,
      'reject': completion.reject,
      'resolve': completion.resolve
    };

    const idleWorker = state.idleWorkers.pop();
    if (idleWorker !== undefined) {
      await this.#assignTask(state, idleWorker, entry);
    } else if (state.spawnedCount < this.#concurrency) {
      state.spawnedCount += 1;
      const worker = this.#createWorker(state, entry.index);
      await this.#assignTask(state, worker, entry);
    } else {
      state.pendingQueue.push(entry);
    }

    return await completion.promise;
  }

  #dispatchAndTrack(state: WorkerPoolRunState<TMessage, TResult>, entry: IndexedItemInterface<TMessage>): Promise<TResult> {
    const result = this.#dispatch(state, entry.item, entry.index);
    state.allDispatchedPromises.push(result);
    return result;
  }

  /** Waits for every dispatched item to settle, then terminates every worker spawned this run. */
  async #shutdownRun(state: WorkerPoolRunState<TMessage, TResult>): Promise<void> {
    state.shuttingDown = true;
    await Promise.allSettled(state.allDispatchedPromises);
    const workersToTerminate = [...state.workerRecords.entries()].map(
      ([worker, record]) => { return [worker, record.lastIndex] as const; }
    );
    const terminationResults = await Promise.allSettled(
      workersToTerminate.map(([worker]) => { const result = worker.terminate(); return result; })
    );
    terminationResults.forEach((outcome, index) => {
      if (outcome.status === 'fulfilled') { return; }
      const workerEntry = workersToTerminate.at(index);
      if (workerEntry === undefined) { return; }
      const [, workerIndex] = workerEntry;
      this.#reportTerminationFailure(state, outcome.reason, workerIndex);
    });
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
      | WorkerErrorEnvelopeEntity.Type
      | WorkerLogEnvelopeEntity.Type
      | WorkerProgressEnvelopeEntity.Type
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
