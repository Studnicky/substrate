import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { BatchStatsEntity } from '../entities/BatchStatsEntity.js';

import { DEFAULT_BATCH_MAX_CONCURRENT, EMPTY_LENGTH, FIRST_ARRAY_INDEX } from '../constants/index.js';
import { BatchError } from '../errors/index.js';

/**
 * A broken hook must not abort the remaining unprocessed items in the
 * batch: record the failure and hand back the sentinel `invoke` expects
 * instead of letting `HookInvoker`'s default (throwing) behavior propagate.
 * Hoisted to module scope so V8 compiles this class once rather than per
 * `Batch` instantiation.
 */
class BatchHookInvoker extends HookInvoker {
  constructor(private readonly onFailure: (hookName: string, cause: unknown) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.onFailure(hookName, cause);
    return undefined as T;
  }
}

export class Batch<TResult = unknown> {
  static create<TResult = unknown>(maxConcurrent?: number): Batch<TResult> {
    return new this(maxConcurrent);
  }

  protected readonly maxConcurrent: number;

  /**
   * Errors raised by lifecycle hook overrides, recorded by `onHookError`
   * instead of aborting the batch loop. Cleared at the start of each
   * `process`/`processSettled` run.
   */
  protected readonly hookErrors: HookInvocationError[] = [];

  protected readonly hooks: HookInvoker;

  protected constructor(maxConcurrent?: number) {
    const value = maxConcurrent ?? DEFAULT_BATCH_MAX_CONCURRENT;
    if (value <= 0 || !Number.isInteger(value)) {
      throw new BatchError('maxConcurrent must be a positive integer');
    }
    this.maxConcurrent = value;
    this.hooks = new BatchHookInvoker((hookName, cause) => {
      this.hookErrors.push(new HookInvocationError(hookName, cause));
    });
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

    this.hookErrors.length = 0;

    const itemsLen = items.length;
    let succeeded = 0;
    let failed = 0;

    await Promise.resolve(this.hooks.invoke('onBatchStart', () => { const result = this.onBatchStart(itemsLen);
      return result; }));

    for (let i = FIRST_ARRAY_INDEX; i < itemsLen; i += this.maxConcurrent) {
      const batch = items.slice(i, i + this.maxConcurrent);
      if (batch.length === this.maxConcurrent) {
        await Promise.resolve(this.hooks.invoke('onConcurrencySaturated', () => { const result = this.onConcurrencySaturated();
          return result; }));
      }
      const batchOffset = i;

      yield batch.map(async (item, batchIdx) => {
        const globalIndex = batchOffset + batchIdx;
        await Promise.resolve(this.hooks.invoke('onItemStart', () => { const hookResult = this.onItemStart(globalIndex);
          return hookResult; }));
        try {
          const result = await operation(item);
          succeeded++;
          await Promise.resolve(this.hooks.invoke('onItemSuccess', () => { const hookResult = this.onItemSuccess(globalIndex, result);
            return hookResult; }));
          await Promise.resolve(this.hooks.invoke('onItemSettled', () => { const hookResult = this.onItemSettled(globalIndex);
            return hookResult; }));
          return result;
        } catch (error) {
          failed++;
          await Promise.resolve(this.hooks.invoke('onItemError', () => { const hookResult = this.onItemError(globalIndex, error);
            return hookResult; }));
          await Promise.resolve(this.hooks.invoke('onItemSettled', () => { const hookResult = this.onItemSettled(globalIndex);
            return hookResult; }));
          throw error;
        }
      });
    }

    const stats: BatchStatsEntity.Type = { 'failed': failed, 'succeeded': succeeded, 'total': itemsLen };
    await Promise.resolve(this.hooks.invoke('onBatchComplete', () => { const result = this.onBatchComplete(stats);
      return result; }));
  }
}
