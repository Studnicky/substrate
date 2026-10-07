
import { BaseError, CallerFault, Predicates, Signal } from '#runtime';

import type {
  WorkerLeaseInterface,
  WorkerPoolInterface
} from '../interfaces/index.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';
import type { WebWorkerPoolOptionsInterface } from './WebWorkerPoolOptionsInterface.js';

import { WorkerPoolError } from '../errors/index.js';
import { WorkerLeasePool } from '../WorkerLeasePool.js';

interface WebWorkerPoolConstructorInterface<
  TInput,
  TOutput,
  TInstance extends WebWorkerPool<TInput, TOutput>
> extends Function {
  readonly 'prototype': TInstance;
}

/** The task's only listener on the caller-derived signal; both the startup and request deadlines derive from `controller.signal`. */
interface TaskCancellationBindingInterface {
  readonly 'controller': AbortController;
  readonly 'release': () => void;
}

interface TaskFailureClassificationInterface {
  readonly 'error': BaseError;
  readonly 'terminate': boolean;
}

/** Browser Worker pool with bounded, liveness-aware leases. */
export class WebWorkerPool<TInput, TOutput> implements WorkerPoolInterface<TInput, TOutput> {
  readonly #activeRuns = new Set<Promise<TOutput[]>>();
  readonly #knownWorkers = new WeakSet<WebWorkerInterface>();
  readonly #pool: WorkerLeasePool<WebWorkerInterface>;
  readonly #abortSignal: AbortSignal | undefined;
  readonly #signal: Signal;
  readonly #timeoutMs: number | undefined;
  readonly #startupTimeoutMs: number | undefined;
  readonly #transport: WebWorkerPoolOptionsInterface<TInput, TOutput>['transport'];
  #closed = false;
  #poolClose: Promise<void> | undefined;

  protected constructor(deps: {
    readonly 'abortSignal': AbortSignal | undefined;
    readonly 'factory': WebWorkerPoolOptionsInterface<TInput, TOutput>['factory'];
    readonly 'maximumWorkers': WebWorkerPoolOptionsInterface<TInput, TOutput>['maximumWorkers'];
    readonly 'signal': Signal;
    readonly 'startupTimeoutMs': number | undefined;
    readonly 'timeoutMs': number | undefined;
    readonly 'transport': WebWorkerPoolOptionsInterface<TInput, TOutput>['transport'];
  }) {
    this.#pool = WorkerLeasePool.create({
      'factory': deps.factory,
      'maximumLeases': deps.maximumWorkers
    });
    this.#abortSignal = deps.abortSignal;
    this.#signal = deps.signal;
    this.#timeoutMs = deps.timeoutMs;
    this.#startupTimeoutMs = deps.startupTimeoutMs;
    this.#transport = deps.transport;
  }

  public static create<
    TInput,
    TOutput,
    TInstance extends WebWorkerPool<TInput, TOutput> = WebWorkerPool<TInput, TOutput>
  >(
    this: WebWorkerPoolConstructorInterface<TInput, TOutput, TInstance>,
    options: WebWorkerPoolOptionsInterface<TInput, TOutput>
  ): TInstance {
    if (options.timeoutMs !== undefined && (!Predicates.isFiniteNumber(options.timeoutMs) || options.timeoutMs < 0)) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidTimeout',
        'message': 'WebWorkerPool timeoutMs must be a non-negative finite number'
      });
    }
    if (options.startupTimeoutMs !== undefined && (!Predicates.isFiniteNumber(options.startupTimeoutMs) || options.startupTimeoutMs < 0)) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidStartupTimeout',
        'message': 'WebWorkerPool startupTimeoutMs must be a non-negative finite number'
      });
    }
    const result: unknown = Reflect.construct(this, [{
      'abortSignal': options.abortSignal,
      'factory': options.factory,
      'maximumWorkers': options.maximumWorkers,
      'signal': options.signal ?? Signal.create(),
      'startupTimeoutMs': options.startupTimeoutMs,
      'timeoutMs': options.timeoutMs,
      'transport': options.transport
    }]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf(result, this)) {
      throw new WorkerPoolError({
        'code': 'workerPool.invalidConstruction',
        'message': 'WebWorkerPool.create() must construct a WebWorkerPool instance'
      });
    }
    return result;
  }

  public run(items: readonly TInput[]): Promise<TOutput[]> {
    if (this.#closed) {
      const result = Promise.reject(new WorkerPoolError({
        'code': 'workerPool.closed',
        'message': 'WebWorkerPool is closed'
      }));
      return result;
    }

    const completion = Promise.all(items.map(async (item): Promise<TOutput> => {
      return await this.#runItem(item);
    }));
    this.#activeRuns.add(completion);
    const result = completion.finally(async (): Promise<void> => {
      this.#activeRuns.delete(completion);
      if (this.#closed && this.#activeRuns.size === 0) {
        await this.#closePool();
      }
    });

    return result;
  }

  public async close(): Promise<void> {
    this.#closed = true;
    if (this.#activeRuns.size > 0) {
      return;
    }
    await this.#closePool();
  }

  #closePool(): Promise<void> {
    if (this.#poolClose === undefined) {
      this.#poolClose = this.#pool.close().catch((cause: unknown): never => {
        const error = WorkerPoolError.from(cause, 'workerPool.closeFailed', 'WebWorkerPool close failed');
        this.onWorkerError(error);
        throw error;
      });
    }
    const result = this.#poolClose;
    return result;
  }

  static #throwIfAborted(signal: AbortSignal): void {
    if (signal?.aborted === true) {
      throw new WorkerPoolError({
        'code': 'workerPool.cancelled',
        'message': 'WebWorkerPool request was cancelled'
      });
    }
  }

  /**
   * Bounds worker acquisition (creation and initialization) by `startupTimeoutMs`, derived from
   * `taskCancelSignal` — this task's own internal cancellation source (see `#runItem`).
   */
  async #acquire(taskCancelSignal: AbortSignal): Promise<WorkerLeaseInterface<WebWorkerInterface>> {
    const startupSignal = this.#startupTimeoutMs !== undefined
      ? AbortSignal.any([taskCancelSignal, AbortSignal.timeout(this.#startupTimeoutMs)])
      : taskCancelSignal;
    if (startupSignal.aborted) {
      throw WebWorkerPool.#startupError(startupSignal, this.#abortSignal);
    }

    let onAbort: (() => void) | undefined;
    const startupAborted = new Promise<never>((_resolve, reject): void => {
      onAbort = (): void => {
        reject(WebWorkerPool.#startupError(startupSignal, this.#abortSignal));
      };
      startupSignal.addEventListener('abort', onAbort, { 'once': true });
    });

    const acquisition = this.#pool.acquire();
    try {
      return await Promise.race([acquisition, startupAborted]);
    } catch (cause) {
      // The startup deadline won the race while acquisition was still pending — reclaim its
      // lease (and the permit it holds) once it eventually settles, instead of leaking it.
      acquisition.then((lease) => {
        lease.terminate().catch((terminationCause: unknown) => {
          this.onWorkerError(WorkerPoolError.from(terminationCause, 'workerPool.terminationFailed', 'WebWorkerPool lease termination failed'));
        });
      }).catch(() => {});
      throw WorkerPoolError.from(cause, 'workerPool.acquireFailed', 'WebWorkerPool worker acquisition failed');
    } finally {
      if (onAbort !== undefined) {
        startupSignal.removeEventListener('abort', onAbort);
      }
    }
  }

  /** True only for the reason `AbortSignal.timeout()` itself produces — a genuinely elapsed deadline, never a caller abort or a pre-aborted signal. */
  static #isTimeoutReason(reason: Error): boolean {
    const result = reason instanceof DOMException && reason.name === 'TimeoutError';
    return result;
  }

  static #startupError(startupSignal: AbortSignal, abortSignal: AbortSignal | undefined): WorkerPoolError {
    const result = WebWorkerPool.#buildStartupError(startupSignal.reason, abortSignal);
    return result;
  }

  static #buildStartupError(reason: Error, abortSignal: AbortSignal | undefined): WorkerPoolError {
    if (abortSignal?.aborted === true) {
      return new WorkerPoolError({
        'cause': reason,
        'code': 'workerPool.cancelled',
        'message': 'WebWorkerPool request was cancelled before its worker finished starting'
      });
    }
    if (WebWorkerPool.#isTimeoutReason(reason)) {
      return new WorkerPoolError({
        'cause': reason,
        'code': 'workerPool.startupTimedOut',
        'message': 'WebWorkerPool worker did not finish starting within its startup timeout'
      });
    }
    return new WorkerPoolError({
      'cause': reason,
      'code': 'workerPool.startupAborted',
      'message': 'WebWorkerPool request was not dispatched because its worker startup signal was already aborted'
    });
  }

  /** Bounds one request by `timeoutMs`, derived from `taskCancelSignal` — see `#acquire`. */
  async #request(lease: WorkerLeaseInterface<WebWorkerInterface>, item: TInput, taskCancelSignal: AbortSignal): Promise<TOutput> {
    const signal = this.#timeoutMs !== undefined
      ? AbortSignal.any([taskCancelSignal, AbortSignal.timeout(this.#timeoutMs)])
      : taskCancelSignal;
    WebWorkerPool.#throwIfAborted(signal);
    const request = lease.request(this.#transport, item);
    let onAbort: (() => void) | undefined;
    const cancellation = new Promise<never>((_resolve, reject): void => {
      onAbort = (): void => {
        const error = this.#abortSignal?.aborted === true
          ? new WorkerPoolError({
            'code': 'workerPool.cancelled',
            'message': 'WebWorkerPool request was cancelled'
          })
          : new WorkerPoolError({
            'code': 'workerPool.timedOut',
            'message': `WebWorkerPool request exceeded its timeout of ${String(this.#timeoutMs)}ms`
          });
        reject(error);
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { 'once': true });
      }
    });

    try {
      return await Promise.race([request, cancellation]);
    } finally {
      if (onAbort !== undefined) {
        signal.removeEventListener('abort', onAbort);
      }
    }
  }

  /** The caller's cancellation source is composed once per item; both deadlines below derive from `controller.signal`. */
  async #composeTaskCancellation(): Promise<TaskCancellationBindingInterface> {
    const composeOptions: { 'signal'?: AbortSignal; } = {};
    if (this.#abortSignal !== undefined) {
      composeOptions.signal = this.#abortSignal;
    }
    const composed = await this.#signal.compose(composeOptions);
    const cancellationSignal = composed.signal;

    const controller = new AbortController();
    const onCancellationAbort = (): void => {
      controller.abort(WorkerPoolError.from(cancellationSignal.reason, 'workerPool.cancelled', 'WebWorkerPool request cancellation signal aborted'));
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

  #classifyRequestFailure(cause: unknown): TaskFailureClassificationInterface {
    const error = WorkerPoolError.from(cause, 'workerPool.requestFailed', 'WebWorkerPool request failed');
    const terminate = error instanceof WorkerPoolError
      && (error.code === 'workerPool.cancelled' || error.code === 'workerPool.timedOut' || error.code === 'workerPool.startupTimedOut' || error.code === 'workerPool.startupAborted');
    return { 'error': error, 'terminate': terminate };
  }

  #reportRequestFailure(error: BaseError): void {
    if (error instanceof WorkerPoolError && error.code === 'workerPool.timedOut') {
      this.onWorkerTimeout();
    } else {
      this.onWorkerError(error);
    }
  }

  async #releaseLease(lease: WorkerLeaseInterface<WebWorkerInterface> | undefined, terminate: boolean): Promise<void> {
    if (lease === undefined) { return; }
    if (terminate) {
      await lease.terminate();
    } else {
      await lease.release();
    }
  }

  async #runItem(item: TInput): Promise<TOutput> {
    const cancellation = await this.#composeTaskCancellation();
    let lease: WorkerLeaseInterface<WebWorkerInterface> | undefined;
    let terminate = false;

    try {
      lease = await this.#acquire(cancellation.controller.signal);
      if (!this.#knownWorkers.has(lease.worker)) {
        this.#knownWorkers.add(lease.worker);
        this.onWorkerCreated(lease.worker);
      }
      return await this.#request(lease, item, cancellation.controller.signal);
    } catch (cause) {
      const classification = this.#classifyRequestFailure(cause);
      terminate = classification.terminate;
      this.#reportRequestFailure(classification.error);
      if (cause instanceof BaseError) {
        throw cause;
      }
      // A non-BaseError here is raised by caller-supplied code (the transport or an
      // `onWorkerCreated` override): the lease pool and factory wrap every platform failure.
      const propagated: never = CallerFault.propagate(cause);
      return propagated;
    } finally {
      cancellation.release();
      await this.#releaseLease(lease, terminate);
    }
  }

  /** Fires once for every Worker instance first acquired by this pool. */
  protected onWorkerCreated(_worker: WebWorkerInterface): void {}

  /** Fires immediately before a timed-out worker lease is terminated. */
  protected onWorkerTimeout(): void {}

  /** Fires when worker creation, a request, or resource cleanup fails. */
  protected onWorkerError(_error: BaseError): void {}
}
