import { Signal } from '@studnicky/signal';
import { Predicates } from '@studnicky/types';

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

/** Browser Worker pool with bounded, liveness-aware leases. */
export class WebWorkerPool<TInput, TOutput> implements WorkerPoolInterface<TInput, TOutput> {
  readonly #activeRuns = new Set<Promise<TOutput[]>>();
  readonly #knownWorkers = new WeakSet<WebWorkerInterface>();
  readonly #pool: WorkerLeasePool<WebWorkerInterface>;
  readonly #abortSignal: AbortSignal | undefined;
  readonly #signal: Signal;
  readonly #timeoutMs: number | undefined;
  readonly #transport: WebWorkerPoolOptionsInterface<TInput, TOutput>['transport'];
  #closed = false;
  #poolClose: Promise<void> | undefined;

  protected constructor(deps: {
    readonly 'abortSignal': AbortSignal | undefined;
    readonly 'factory': WebWorkerPoolOptionsInterface<TInput, TOutput>['factory'];
    readonly 'maximumWorkers': WebWorkerPoolOptionsInterface<TInput, TOutput>['maximumWorkers'];
    readonly 'signal': Signal;
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
    this.#transport = deps.transport;
  }

  private static isConstructed<
    TInput,
    TOutput,
    TInstance extends WebWorkerPool<TInput, TOutput>
  >(
    value: object,
    constructor: WebWorkerPoolConstructorInterface<TInput, TOutput, TInstance>
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
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
    const result: unknown = Reflect.construct(this, [{
      'abortSignal': options.abortSignal,
      'factory': options.factory,
      'maximumWorkers': options.maximumWorkers,
      'signal': options.signal ?? Signal.create(),
      'timeoutMs': options.timeoutMs,
      'transport': options.transport
    }]);
    if (!Predicates.isObjectLike(result) || !WebWorkerPool.isConstructed(result, this)) {
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
        const error = WebWorkerPool.#toWorkerPoolError(cause);
        this.onWorkerError(error);
        throw error;
      });
    }
    try {
      const result = this.#poolClose;
      return result;
    } catch (cause) {
      throw WebWorkerPool.#toWorkerPoolError(cause);
    }
  }

  static #throwIfAborted(signal: AbortSignal): void {
    if (signal?.aborted === true) {
      throw new WorkerPoolError({
        'code': 'workerPool.cancelled',
        'message': 'WebWorkerPool request was cancelled'
      });
    }
  }

  static #toWorkerPoolError(cause: unknown): Error {
    const result = Predicates.isError(cause)
      ? cause
      : new WorkerPoolError({
        'cause': cause,
        'code': 'workerPool.requestFailed',
        'message': 'WebWorkerPool request failed'
      });
    return result;
  }

  async #request(lease: WorkerLeaseInterface<WebWorkerInterface>, item: TInput): Promise<TOutput> {
    const composeOptions: { 'deadlineMs'?: number; 'signal'?: AbortSignal; } = {};
    if (this.#timeoutMs !== undefined) {
      composeOptions.deadlineMs = this.#timeoutMs;
    }
    if (this.#abortSignal !== undefined) {
      composeOptions.signal = this.#abortSignal;
    }
    const signal = await this.#signal.compose(composeOptions);
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

  async #runItem(item: TInput): Promise<TOutput> {
    let lease: WorkerLeaseInterface<WebWorkerInterface> | undefined;
    let terminate = false;

    try {
      lease = await this.#pool.acquire();
      if (!this.#knownWorkers.has(lease.worker)) {
        this.#knownWorkers.add(lease.worker);
        this.onWorkerCreated(lease.worker);
      }
      return await this.#request(lease, item);
    } catch (cause) {
      const error = WebWorkerPool.#toWorkerPoolError(cause);
      terminate = error instanceof WorkerPoolError
        && (error.code === 'workerPool.cancelled' || error.code === 'workerPool.timedOut');
      if (error instanceof WorkerPoolError && error.code === 'workerPool.timedOut') {
        this.onWorkerTimeout();
      } else {
        this.onWorkerError(error);
      }
      throw error;
    } finally {
      if (lease !== undefined) {
        if (terminate) {
          await lease.terminate();
        } else {
          await lease.release();
        }
      }
    }
  }

  /** Fires once for every Worker instance first acquired by this pool. */
  protected onWorkerCreated(_worker: WebWorkerInterface): void {}

  /** Fires immediately before a timed-out worker lease is terminated. */
  protected onWorkerTimeout(): void {}

  /** Fires when worker creation, a request, or resource cleanup fails. */
  protected onWorkerError(_error: Error): void {}
}
