import type { BatchStatsType } from '../types/BatchStatsType.js';

import { DEFAULT_BATCH_MAX_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX } from '../constants/index.js';
import { BatchError } from '../errors/index.js';

export class Batch<TResult = unknown> {
  static create<TResult = unknown>(maxConcurrent?: number): Batch<TResult> {
    return new this(maxConcurrent);
  }

  protected readonly maxConcurrent: number;

  protected constructor(maxConcurrent?: number) {
    const value = maxConcurrent ?? DEFAULT_BATCH_MAX_CONCURRENT;
    if (value <= 0 || !Number.isInteger(value)) {
      throw new BatchError('maxConcurrent must be a positive integer');
    }
    this.maxConcurrent = value;
  }

  protected onBatchStart(_total: number): void {}
  protected onConcurrencySaturated(): void {}
  protected onItemStart(_index: number): void {}
  protected onItemSuccess(_index: number, _result: TResult): void {}
  protected onItemError(_index: number, _error: unknown): void {}
  protected onItemSettled(_index: number): void {}
  protected onBatchComplete(_stats: BatchStatsType): void {}

  async *process<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): AsyncGenerator<TResult[], void, unknown> {
    if (items.length === EMPTY_LENGTH) { return; }

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    this.#invokeHook(() => { this.onBatchStart(itemsLen); });

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += this.maxConcurrent) {
      const batch = items.slice(i, i + this.maxConcurrent);
      if (batch.length === this.maxConcurrent) { this.#invokeHook(() => { this.onConcurrencySaturated(); }); }
      const batchOffset = i;
      const batchResults = await Promise.all(
        batch.map(async (item, batchIdx) => {
          const globalIndex = batchOffset + batchIdx;
          this.#invokeHook(() => { this.onItemStart(globalIndex); });
          try {
            const result = await operation(item);
            succeeded++;
            this.#invokeHook(() => { this.onItemSuccess(globalIndex, result); });
            this.#invokeHook(() => { this.onItemSettled(globalIndex); });
            return result;
          } catch (error) {
            failed++;
            this.#invokeHook(() => { this.onItemError(globalIndex, error); });
            this.#invokeHook(() => { this.onItemSettled(globalIndex); });
            throw error;
          }
        })
      );
      yield batchResults;
    }

    const stats: BatchStatsType = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    this.#invokeHook(() => { this.onBatchComplete(stats); });
  }

  async *processSettled<T>(
    items: readonly T[],
    operation: (item: T) => Promise<TResult>
  ): AsyncGenerator<PromiseSettledResult<TResult>[], void, unknown> {
    if (items.length === EMPTY_LENGTH) { return; }

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    this.#invokeHook(() => { this.onBatchStart(itemsLen); });

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += this.maxConcurrent) {
      const batch = items.slice(i, i + this.maxConcurrent);
      if (batch.length === this.maxConcurrent) { this.#invokeHook(() => { this.onConcurrencySaturated(); }); }
      const batchOffset = i;
      const batchResults = await Promise.allSettled(
        batch.map(async (item, batchIdx) => {
          const globalIndex = batchOffset + batchIdx;
          this.#invokeHook(() => { this.onItemStart(globalIndex); });
          try {
            const result = await operation(item);
            succeeded++;
            this.#invokeHook(() => { this.onItemSuccess(globalIndex, result); });
            this.#invokeHook(() => { this.onItemSettled(globalIndex); });
            return result;
          } catch (error) {
            failed++;
            this.#invokeHook(() => { this.onItemError(globalIndex, error); });
            this.#invokeHook(() => { this.onItemSettled(globalIndex); });
            throw error;
          }
        })
      );
      yield batchResults;
    }

    const stats: BatchStatsType = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    this.#invokeHook(() => { this.onBatchComplete(stats); });
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }
}
