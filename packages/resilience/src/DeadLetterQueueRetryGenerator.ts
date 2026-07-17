/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DlqEntryType } from './DlqEntryType.js';

import { DeadLetterQueueRetryGeneratorBuilder } from './DeadLetterQueueRetryGeneratorBuilder.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

// json-schema-uninexpressible: 'dlq' is a live DeadLetterQueue<T> class instance and T is a generic type parameter — not a serializable data shape
type RetryGeneratorOptions<T> = {
  readonly 'dlq': DeadLetterQueue<T>;
  readonly 'intervalMs': number;
};

/**
 * Delegates `DeadLetterQueueRetryGenerator`'s hook-invocation failures back to
 * the owning generator's own `hookErrors` array. Hoisted to module scope so
 * V8 compiles this class once rather than per `DeadLetterQueueRetryGenerator`
 * instantiation.
 */
class DeadLetterQueueRetryGeneratorHookDelegate extends HookInvoker {
  constructor(private readonly recordFailure: (error: HookInvocationError) => void) {
    super();
  }

  /**
   * A broken hook must not abort the retry generator loop: record the
   * failure and hand back the sentinel `invoke` expects instead of letting
   * `HookInvoker`'s default (throwing) behavior propagate.
   */
  protected override onHookError<TResult>(hookName: string, cause: unknown): TResult {
    this.recordFailure(new HookInvocationError(hookName, cause));
    return undefined as TResult;
  }
}

export class DeadLetterQueueRetryGenerator<T> {
  readonly #dlq: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  /**
   * Errors raised by lifecycle hook overrides, recorded by `onHookError`
   * instead of propagating out of the retry generator's `generate()` loop.
   */
  protected readonly hookErrors: HookInvocationError[] = [];

  /** Invokes lifecycle hooks, recording failures into `hookErrors` instead of throwing. */
  protected readonly hooks: HookInvoker;

  static builder<T>(): DeadLetterQueueRetryGeneratorBuilder<T> {
    const factory = (options: RetryGeneratorOptions<T>): DeadLetterQueueRetryGenerator<T> => {
      const result = DeadLetterQueueRetryGenerator.create<T>(options);
      return result;
    };
    const result = DeadLetterQueueRetryGeneratorBuilder.create<T>(factory);
    return result;
  }

  static create<T>(options: RetryGeneratorOptions<T>): DeadLetterQueueRetryGenerator<T> {
    return new DeadLetterQueueRetryGenerator<T>(options);
  }

  protected constructor(options: RetryGeneratorOptions<T>) {
    this.hooks = new DeadLetterQueueRetryGeneratorHookDelegate((error) => { this.hookErrors.push(error); });
    if (options.dlq === null || options.dlq === undefined) {
      throw new ResilienceConfigError('dlq is required');
    }
    this.#dlq = options.dlq;
    this.#intervalMs = options.intervalMs;
  }

  async *generate(): AsyncGenerator<DlqEntryType<T>> {
    const drainIterator = this.#dlq.drain();
    for await (const entry of drainIterator) {
      this.hooks.invoke('onYield', () => {
        const result = this.onYield(entry);
        return result;
      });
      yield entry;
      this.hooks.invoke('onWait', () => {
        const result = this.onWait(this.#intervalMs);
        return result;
      });
      await new Promise<void>((resolve) => { setTimeout(resolve, this.#intervalMs); });
    }
    this.hooks.invoke('onDone', () => {
      const result = this.onDone();
      return result;
    });
  }

  /**
   * Fires immediately before each entry is yielded from `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onYield(_entry: DlqEntryType<T>): void {}

  /**
   * Fires before each inter-entry delay in `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onWait(_intervalMs: number): void {}

  /**
   * Fires when the generator finishes (DLQ closed or aborted, drain exhausted).
   * Must not throw or block.
   */
  protected onDone(): void {}
}
