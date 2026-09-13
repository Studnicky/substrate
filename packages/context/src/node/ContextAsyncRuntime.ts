import { AsyncLocalStorage } from 'node:async_hooks';

export class ContextAsyncRuntime {
  static await<TResult>(value: TResult | PromiseLike<TResult>): Promise<Awaited<TResult>> {
    const runInContext = AsyncLocalStorage.snapshot();
    const result = Promise.resolve(value).then(
      (resolvedValue) => {
        const restoredResult = runInContext(() => {
          const restoredValue = resolvedValue;
          return restoredValue;
        });
        return restoredResult;
      },
      (error: unknown) => {
        const rejectedResult = runInContext(() => {
          throw error;
        });
        return rejectedResult;
      }
    );
    return result;
  }
}
