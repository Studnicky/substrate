import { AsyncLocalStorage } from 'node:async_hooks';

import { CallerFault } from '#runtime';

export class ContextAsyncRuntime {
  static await<TResult>(value: TResult | PromiseLike<TResult>): Promise<Awaited<TResult>> {
    const runInContext = AsyncLocalStorage.snapshot();
    const result = Promise.resolve(value).then(
      (resolvedValue) => {
        const restoredResult = runInContext(() => { return resolvedValue; });
        return restoredResult;
      },
      (error: unknown) => {
        const rejectedResult = runInContext(() => { CallerFault.propagate(error); });
        return rejectedResult;
      }
    );
    return result;
  }
}
