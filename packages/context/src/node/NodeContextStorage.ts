import { AsyncLocalStorage } from 'node:async_hooks';

import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

export class NodeContextStorage implements ContextStorageInterface {
  readonly #storage: AsyncLocalStorage<Map<string, unknown>> = new AsyncLocalStorage<Map<string, unknown>>();

  getStore(): Map<string, unknown> | undefined {
    const result = this.#storage.getStore();
    return result;
  }

  run<TResult>(store: Map<string, unknown>, callback: () => TResult): TResult {
    const result = this.#storage.run(store, callback);
    return result;
  }

  await<TResult>(
    store: Map<string, unknown>,
    value: TResult | PromiseLike<TResult>
  ): Promise<Awaited<TResult>> {
    const runInScope = this.#storage.run(store, () => {
      const snapshot = AsyncLocalStorage.snapshot();
      return snapshot;
    });
    const result = Promise.resolve(value).then(
      (resolvedValue) => {
        const restoredResult = runInScope(() => {
          const restoredValue = resolvedValue;
          return restoredValue;
        });
        return restoredResult;
      },
      (error: unknown) => {
        const rejectedResult = runInScope(() => {
          throw error;
        });
        return rejectedResult;
      }
    );
    return result;
  }

  bind<TArguments extends readonly unknown[], TResult>(
    store: Map<string, unknown>,
    callback: (...argumentList: TArguments) => TResult
  ): (...argumentList: TArguments) => TResult {
    const runInScope = this.#storage.run(store, () => {
      const snapshot = AsyncLocalStorage.snapshot();
      return snapshot;
    });
    const result = (...argumentList: TArguments): TResult => {
      const callbackResult = runInScope(() => {
        const callbackValue = callback(...argumentList);
        return callbackValue;
      });
      return callbackResult;
    };
    return result;
  }
}
