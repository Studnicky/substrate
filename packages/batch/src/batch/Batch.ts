import { HookInvoker } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { BatchStatsEntity } from '../entities/BatchStatsEntity.js';

import { DEFAULT_BATCH_MAXIMUM_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX } from '../constants/index.js';
import { BatchError } from '../errors/index.js';

interface BatchSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

interface ItemProcessingOptionsInterface {
  readonly 'counters'?: Map<'failed' | 'succeeded', number>;
}

interface ContinuousProcessingStateInterface<TResult> {
  'nextIndex': number;
  readonly 'outcomes': (PromiseSettledResult<TResult> | undefined)[];
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
    if (!Predicates.isObjectLike(result) || !Batch.isConstructed<TInstance>(result, this)) {
      throw new BatchError('Batch.create() must construct a Batch instance');
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

  /** Process every item with immediate permit refill and fail-fast result semantics. */
  public async processContinuous<T>(items: readonly T[], operation: (item: T) => Promise<TResult>): Promise<TResult[]> {
    if (items.length === EMPTY_LENGTH) {
      return [];
    }
    const outcomes = await this.#processContinuously(items, operation);
    await this.#notifyBatchComplete(items.length, outcomes);
    const result = this.#resolveContinuousResults(outcomes);
    return result;
  }

  /** Process every item with immediate permit refill and collect all settlements. */
  public async processContinuousSettled<T>(items: readonly T[], operation: (item: T) => Promise<TResult>): Promise<PromiseSettledResult<TResult>[]> {
    if (items.length === EMPTY_LENGTH) {
      return [];
    }
    const outcomes = await this.#processContinuously(items, operation);
    await this.#notifyBatchComplete(items.length, outcomes);
    const result = this.#resolveContinuousOutcomes(outcomes);
    return result;
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
    options: ItemProcessingOptionsInterface
  ): Promise<TResult> {
    const counters = options.counters;
    await this.hooks.invokeAsync('onItemStart', () => {
      const hookResult = this.onItemStart(globalIndex);
      return hookResult;
    });
    try {
      const result = await operation(item);
      if (counters !== undefined) {
        counters.set('succeeded', (counters.get('succeeded') ?? 0) + 1);
      }
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
      if (counters !== undefined) {
        counters.set('failed', (counters.get('failed') ?? 0) + 1);
      }
      const itemError = Predicates.isError(error) ? error : new Error(String(error));
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
      result.push(this.#processItem(item, batchOffset + batchIndex, operation, { 'counters': counters }));
    }
    return result;
  }

  async #notifyConcurrencySaturated(): Promise<void> {
    await this.hooks.invokeAsync('onConcurrencySaturated', () => {
      const result = this.onConcurrencySaturated();
      return result;
    });
  }

  async #notifyBatchComplete(
    total: number,
    settled: readonly (PromiseSettledResult<TResult> | undefined)[]
  ): Promise<void> {
    let failed = 0;
    let succeeded = 0;
    for (let index = FIRST_ARRAY_INDEX; index < settled.length; index += 1) {
      const result = settled[index];
      if (result?.status === 'fulfilled') {
        succeeded += 1;
      } else if (result?.status === 'rejected') {
        failed += 1;
      }
    }
    const stats: BatchStatsEntity.Type = { 'failed': failed, 'succeeded': succeeded, 'total': total };
    await this.hooks.invokeAsync('onBatchComplete', () => { const result = this.onBatchComplete(stats); return result; });
  }

  async #processContinuously<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): Promise<readonly (PromiseSettledResult<TResult> | undefined)[]> {
    await this.hooks.invokeAsync('onBatchStart', () => { const result = this.onBatchStart(items.length); return result; });
    const state: ContinuousProcessingStateInterface<TResult> = { 'nextIndex': FIRST_ARRAY_INDEX, 'outcomes': [] };
    const workers: Promise<void>[] = [];
    const workerCount = Math.min(items.length, this.maximumConcurrent);
    for (let workerIndex = FIRST_ARRAY_INDEX; workerIndex < workerCount; workerIndex += 1) {
      workers.push(this.#processContinuousWorker(items, operation, state));
    }
    await Promise.all(workers);
    return state.outcomes;
  }

  async #processContinuousWorker<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>,
    state: ContinuousProcessingStateInterface<TResult>
  ): Promise<void> {
    while (state.nextIndex < items.length) {
      const index = state.nextIndex;
      state.nextIndex += 1;
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      if (index === this.maximumConcurrent) {
        await this.#notifyConcurrencySaturated();
      }
      state.outcomes[index] = await this.#processContinuousItem(item, index, operation);
    }
  }

  async #processContinuousItem<T>(
    item: T,
    index: number,
    operation: (item: T) => Promise<TResult>
  ): Promise<PromiseSettledResult<TResult>> {
    try {
      const value = await this.#processItem(item, index, operation, {});
      return { 'status': 'fulfilled', 'value': value };
    } catch (reason) {
      return { 'reason': reason, 'status': 'rejected' };
    }
  }

  #resolveContinuousOutcomes(
    outcomes: readonly (PromiseSettledResult<TResult> | undefined)[]
  ): PromiseSettledResult<TResult>[] {
    const result: PromiseSettledResult<TResult>[] = [];
    for (let index = FIRST_ARRAY_INDEX; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      if (outcome !== undefined) {
        result.push(outcome);
      }
    }
    return result;
  }

  #resolveContinuousResults(outcomes: readonly (PromiseSettledResult<TResult> | undefined)[]): TResult[] {
    const result: TResult[] = [];
    const settled = this.#resolveContinuousOutcomes(outcomes);
    for (let index = FIRST_ARRAY_INDEX; index < settled.length; index += 1) {
      const outcome = settled[index];
      if (outcome?.status === 'rejected') {
        throw outcome.reason;
      }
      if (outcome?.status === 'fulfilled') {
        result.push(outcome.value);
      }
    }
    return result;
  }
}
