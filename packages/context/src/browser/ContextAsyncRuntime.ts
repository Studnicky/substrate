import { CallerFault } from '@studnicky/types/browser';

import { BrowserContextStorage } from './BrowserContextStorage.js';

export class ContextAsyncRuntime {
  static await<TResult>(value: TResult | PromiseLike<TResult>): Promise<Awaited<TResult>> {
    const activeStores = BrowserContextStorage.capture();
    BrowserContextStorage.clear();

    const result = Promise.resolve(value).then(
      (resolvedValue) => {
        BrowserContextStorage.restore(activeStores);
        return resolvedValue;
      },
      (error: unknown) => {
        BrowserContextStorage.restore(activeStores);
        CallerFault.propagate(error);
      }
    );
    return result;
  }
}
