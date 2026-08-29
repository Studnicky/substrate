/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import { HookInvoker } from '@studnicky/errors';
import { SchemaValidator } from '@studnicky/json';
import { Delay } from '@studnicky/scheduler';

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DeadLetterQueueEntryInterface } from './interfaces/DeadLetterQueueEntryInterface.js';
import type { DeadLetterQueueRetryGeneratorOptionsInterface } from './interfaces/DeadLetterQueueRetryGeneratorOptionsInterface.js';

import { DeadLetterQueueRetryGeneratorOptionsEntity } from './entities/DeadLetterQueueRetryGeneratorOptionsEntity.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class DeadLetterQueueRetryGenerator<T> {
  static readonly #OwnedHookInvoker = class DeadLetterQueueRetryGeneratorHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #deadLetterQueue: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<T>(options: DeadLetterQueueRetryGeneratorOptionsInterface<T>): DeadLetterQueueRetryGenerator<T> {
    const result = new DeadLetterQueueRetryGenerator<T>(options);
    return result;
  }

  protected constructor(options: DeadLetterQueueRetryGeneratorOptionsInterface<T>) {
    this.hooks = new DeadLetterQueueRetryGenerator.#OwnedHookInvoker();
    if (options.deadLetterQueue === null || options.deadLetterQueue === undefined) {
      throw new ResilienceConfigError('deadLetterQueue is required');
    }
    const schemaOptions: DeadLetterQueueRetryGeneratorOptionsEntity.Type = {
      'intervalMs': options.intervalMs
    };
    if (!DeadLetterQueueRetryGeneratorOptionsEntity.validate(schemaOptions)) {
      const messages = SchemaValidator.formatErrors(DeadLetterQueueRetryGeneratorOptionsEntity.validate.errors);
      throw new ResilienceConfigError(messages);
    }
    this.#deadLetterQueue = options.deadLetterQueue;
    this.#intervalMs = schemaOptions.intervalMs;
  }

  async *generate(): AsyncGenerator<DeadLetterQueueEntryInterface<T>> {
    const drainIterator = this.#deadLetterQueue.drain();
    for await (const entry of drainIterator) {
      this.#invokeOnYield(entry);
      yield entry;
      this.#invokeOnWait();
      await Delay.sleep(this.#intervalMs);
    }
    this.#invokeOnDone();
  }

  /** Extracted so the `onYield` hook callback isn't rebuilt inline on every `generate()` iteration. */
  #invokeOnYield(entry: DeadLetterQueueEntryInterface<T>): void {
    this.hooks.invoke('onYield', () => {
      const result = this.onYield(entry);
      return result;
    });
  }

  /** Extracted so the `onWait` hook callback isn't rebuilt inline on every `generate()` iteration. */
  #invokeOnWait(): void {
    this.hooks.invoke('onWait', () => {
      const result = this.onWait(this.#intervalMs);
      return result;
    });
  }

  /** Extracted so the `onDone` hook callback isn't rebuilt inline on every `generate()` iteration. */
  #invokeOnDone(): void {
    this.hooks.invoke('onDone', () => {
      const result = this.onDone();
      return result;
    });
  }

  /**
   * Fires immediately before each entry is yielded from `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onYield(_entry: DeadLetterQueueEntryInterface<T>): void {}

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
