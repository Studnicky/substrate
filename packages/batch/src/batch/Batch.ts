import { HookInvoker } from '@studnicky/errors';

import type { BatchStatsEntity } from '../entities/BatchStatsEntity.js';

import { DEFAULT_BATCH_MAX_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX } from '../constants/index.js';
import { BatchError } from '../errors/index.js';

export class Batch<TResult = unknown> {
  /** Keeps batch processing intact when a lifecycle hook fails. */
  static readonly #OwnedHookInvoker = class BatchHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  static create<TResult = unknown>(maxConcurrent?: number): Batch<TResult> {
    return new this(maxConcurrent);
  }

  protected readonly maxConcurrent: number;

  protected readonly hooks: HookInvoker;

  protected constructor(maxConcurrent?: number) {
    const value = maxConcurrent ?? DEFAULT_BATCH_MAX_CONCURRENT;
    if (value <= 0 || !Number.isInteger(value)) {
      throw new BatchError('maxConcurrent must be a positive integer');
    }
    this.maxConcurrent = value;
    this.hooks = new Batch.#OwnedHookInvoker();
  }

  protected onBatchStart(_total: number): void {}
  protected onConcurrencySaturated(): void {}
  protected onItemStart(_index: number): void {}
  protected onItemSuccess(_index: number, _result: TResult): void {}
  protected onItemError(_index: number, _error: unknown): void {}
  protected onItemSettled(_index: number): void {}
  protected onBatchComplete(_stats: BatchStatsEntity.Type): void {}

  async *process<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): AsyncGenerator<TResult[], void, unknown> {
    for await (const settling of this.#iterateBatches(items, operation)) {
      yield await Promise.all(settling);
    }
  }

  async *processSettled<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): AsyncGenerator<PromiseSettledResult<TResult>[], void, unknown> {
    for await (const settling of this.#iterateBatches(items, operation)) {
      yield await Promise.allSettled(settling);
    }
  }

  /**
   * Drives the concurrency-windowed loop and hook lifecycle shared by
   * `process()` and `processSettled()`. Yields, per batch, the in-flight
   * item promises — unaggregated, so each caller settles them with the
   * aggregation strategy (`Promise.all` vs `Promise.allSettled`) that
   * defines its own failure semantics.
   */
  async *#iterateBatches<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): AsyncGenerator<Promise<TResult>[], void, unknown> {
    if (items.length === EMPTY_LENGTH) { return; }

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    await this.hooks.invokeAsync('onBatchStart', () => { const result = this.onBatchStart(itemsLen);
      return result; });

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += this.maxConcurrent) {
      const batch = items.slice(i, i + this.maxConcurrent);
      if (batch.length === this.maxConcurrent) {
        await this.hooks.invokeAsync('onConcurrencySaturated', () => { const result = this.onConcurrencySaturated();
          return result; });
      }
      const batchOffset = i;

      yield batch.map(async (item, batchIdx) => {
        const globalIndex = batchOffset + batchIdx;
        await this.hooks.invokeAsync('onItemStart', () => { const hookResult = this.onItemStart(globalIndex);
          return hookResult; });
        try {
          const result = await operation(item);
          succeeded++;
          await this.hooks.invokeAsync('onItemSuccess', () => { const hookResult = this.onItemSuccess(globalIndex, result);
            return hookResult; });
          await this.hooks.invokeAsync('onItemSettled', () => { const hookResult = this.onItemSettled(globalIndex);
            return hookResult; });
          return result;
        } catch (error) {
          failed++;
          await this.hooks.invokeAsync('onItemError', () => { const hookResult = this.onItemError(globalIndex, error);
            return hookResult; });
          await this.hooks.invokeAsync('onItemSettled', () => { const hookResult = this.onItemSettled(globalIndex);
            return hookResult; });
          throw error;
        }
      });
    }

    const stats: BatchStatsEntity.Type = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    await this.hooks.invokeAsync('onBatchComplete', () => { const result = this.onBatchComplete(stats);
      return result; });
  }
}
