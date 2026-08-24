import { HookInvoker } from '@studnicky/errors';
import { Guard } from '@studnicky/types';

import type { BatchStatsEntity } from '../entities/BatchStatsEntity.js';

import { DEFAULT_BATCH_MAXIMUM_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX } from '../constants/index.js';
import { BatchError } from '../errors/index.js';

interface BatchSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

export class Batch<TResult = unknown> {
  /** Keeps batch processing intact when a lifecycle hook fails. */
  static readonly #OwnedHookInvoker = class BatchHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  private static isConstructed<TInstance extends object>(
    value: object,
    constructor: BatchSubclassInterface<TInstance>
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }

  static create<TResult = unknown, TInstance extends Batch<TResult> = Batch<TResult>>(
    this: BatchSubclassInterface<TInstance>,
    maximumConcurrent?: number
  ): TInstance {
    const result: unknown = Reflect.construct(this, [maximumConcurrent]);
    if (!Guard.isObjectLike(result) || !Batch.isConstructed<TInstance>(result, this)) {
      throw new TypeError('Batch.create() must construct a Batch instance');
    }
    return result;
  }

  protected readonly maximumConcurrent: number;

  protected readonly hooks: HookInvoker;

  protected constructor(maximumConcurrent?: number) {
    const value = maximumConcurrent ?? DEFAULT_BATCH_MAXIMUM_CONCURRENT;
    if (value <= 0 || !Number.isInteger(value)) {
      throw new BatchError('maximumConcurrent must be a positive integer');
    }
    this.maximumConcurrent = value;
    this.hooks = new Batch.#OwnedHookInvoker();
  }

  protected onBatchStart(_total: number): void {}
  protected onConcurrencySaturated(): void {}
  protected onItemStart(_index: number): void {}
  protected onItemSuccess(_index: number, _result: TResult): void {}
  protected onItemError(_index: number, _error: Error): void {}
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

    const itemsLength = items.length;
    const counters = new Map<'failed' | 'succeeded', number>([
      ['failed', 0],
      ['succeeded', 0]
    ]);

    await this.hooks.invokeAsync('onBatchStart', () => { const result = this.onBatchStart(itemsLength);
      return result; });

    for (let i = FIRST_ARRAY_INDEX; i < itemsLength; i += this.maximumConcurrent) {
      const batch = items.slice(i, i + this.maximumConcurrent);
      if (batch.length === this.maximumConcurrent) {
        await this.#notifyConcurrencySaturated();
      }
      const batchOffset = i;

      yield this.#createBatchItemPromises(batch, batchOffset, operation, counters);
    }

    const stats: BatchStatsEntity.Type = {
      'failed': counters.get('failed') ?? 0,
      'succeeded': counters.get('succeeded') ?? 0,
      'total': itemsLength
    };
    await this.hooks.invokeAsync('onBatchComplete', () => { const result = this.onBatchComplete(stats);
      return result; });
  }

  async #processItem<T>(
    item: T,
    globalIndex: number,
    operation: (item: T) => Promise<TResult>,
    counters: Map<'failed' | 'succeeded', number>
  ): Promise<TResult> {
    await this.hooks.invokeAsync('onItemStart', () => {
      const hookResult = this.onItemStart(globalIndex);
      return hookResult;
    });
    try {
      const result = await operation(item);
      counters.set('succeeded', (counters.get('succeeded') ?? 0) + 1);
      await this.hooks.invokeAsync('onItemSuccess', () => {
        const hookResult = this.onItemSuccess(globalIndex, result);
        return hookResult;
      });
      await this.hooks.invokeAsync('onItemSettled', () => {
        const hookResult = this.onItemSettled(globalIndex);
        return hookResult;
      });
      return result;
    } catch (error) {
      counters.set('failed', (counters.get('failed') ?? 0) + 1);
      const itemError = error instanceof Error ? error : new Error(String(error));
      await this.hooks.invokeAsync('onItemError', () => {
        const hookResult = this.onItemError(globalIndex, itemError);
        return hookResult;
      });
      await this.hooks.invokeAsync('onItemSettled', () => {
        const hookResult = this.onItemSettled(globalIndex);
        return hookResult;
      });
      throw error;
    }
  }

  #createBatchItemPromises<T>(
    batch: readonly T[],
    batchOffset: number,
    operation: (item: T) => Promise<TResult>,
    counters: Map<'failed' | 'succeeded', number>
  ): Promise<TResult>[] {
    const result: Promise<TResult>[] = [];
    const batchLength = batch.length;
    for (let batchIndex = FIRST_ARRAY_INDEX; batchIndex < batchLength; batchIndex += 1) {
      const item = batch[batchIndex];
      if (item === undefined) {
        continue;
      }
      result.push(this.#processItem(item, batchOffset + batchIndex, operation, counters));
    }
    return result;
  }

  async #notifyConcurrencySaturated(): Promise<void> {
    await this.hooks.invokeAsync('onConcurrencySaturated', () => {
      const result = this.onConcurrencySaturated();
      return result;
    });
  }
}
