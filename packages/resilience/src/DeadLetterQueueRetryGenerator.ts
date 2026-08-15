/** Wraps a DeadLetterQueue and re-yields entries at a configurable interval. */

import { HookInvoker } from '@studnicky/errors';
import { SchemaValidator } from '@studnicky/json';

import type { DeadLetterQueue } from './DeadLetterQueue.js';
import type { DeadLetterQueueRetryGeneratorOptionsInterface } from './interfaces/DeadLetterQueueRetryGeneratorOptionsInterface.js';
import type { DlqEntryInterface } from './interfaces/DlqEntryInterface.js';

import { DeadLetterQueueRetryGeneratorOptionsEntity } from './entities/DeadLetterQueueRetryGeneratorOptionsEntity.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

export class DeadLetterQueueRetryGenerator<T> {
  static readonly #OwnedHookInvoker = class DeadLetterQueueRetryGeneratorHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #dlq: DeadLetterQueue<T>;
  readonly #intervalMs: number;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<T>(options: DeadLetterQueueRetryGeneratorOptionsInterface<T>): DeadLetterQueueRetryGenerator<T> {
    return new DeadLetterQueueRetryGenerator<T>(options);
  }

  protected constructor(options: DeadLetterQueueRetryGeneratorOptionsInterface<T>) {
    this.hooks = new DeadLetterQueueRetryGenerator.#OwnedHookInvoker();
    if (options.dlq === null || options.dlq === undefined) {
      throw new ResilienceConfigError('dlq is required');
    }
    const schemaOptions: DeadLetterQueueRetryGeneratorOptionsEntity.Type = {
      'intervalMs': options.intervalMs
    };
    if (!DeadLetterQueueRetryGeneratorOptionsEntity.validate(schemaOptions)) {
      const messages = SchemaValidator.formatErrors(DeadLetterQueueRetryGeneratorOptionsEntity.validate.errors);
      throw new ResilienceConfigError(messages);
    }
    this.#dlq = options.dlq;
    this.#intervalMs = schemaOptions.intervalMs;
  }

  async *generate(): AsyncGenerator<DlqEntryInterface<T>> {
    const drainIterator = this.#dlq.drain();
    for await (const entry of drainIterator) {
      this.#invokeOnYield(entry);
      yield entry;
      this.#invokeOnWait();
      await this.#waitInterval();
    }
    this.#invokeOnDone();
  }

  /** Extracted so the `onYield` hook callback isn't rebuilt inline on every `generate()` iteration. */
  #invokeOnYield(entry: DlqEntryInterface<T>): void {
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

  /** Extracted so the delay's executor isn't rebuilt inline on every `generate()` iteration. */
  #waitInterval(): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, this.#intervalMs);
    });
  }

  /**
   * Fires immediately before each entry is yielded from `generate()`.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onYield(_entry: DlqEntryInterface<T>): void {}

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
