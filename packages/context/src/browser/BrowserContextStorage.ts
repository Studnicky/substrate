import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

export class BrowserContextStorage implements ContextStorageInterface {
  static readonly #activeStores: Map<symbol, Map<string, unknown>> = new Map();

  readonly #token: symbol = Symbol();

  static capture(): Map<symbol, Map<string, unknown>> {
    const result = new Map(BrowserContextStorage.#activeStores);
    return result;
  }

  static clear(): void {
    BrowserContextStorage.#activeStores.clear();
  }

  static restore(stores: Map<symbol, Map<string, unknown>>): void {
    BrowserContextStorage.#activeStores.clear();
    for (const [storage, store] of stores) {
      BrowserContextStorage.#activeStores.set(storage, store);
    }
  }

  static activate(token: symbol, store: Map<string, unknown>): void {
    BrowserContextStorage.#activeStores.set(token, store);
  }

  static #run<TResult>(token: symbol, store: Map<string, unknown>, callback: () => TResult): TResult {
    const beforeRun = BrowserContextStorage.capture();
    BrowserContextStorage.activate(token, store);

    let result: TResult;
    try {
      result = callback();
    } catch (error) {
      BrowserContextStorage.restore(beforeRun);
      throw error;
    }

    if (result instanceof Promise) {
      BrowserContextStorage.restore(beforeRun);
      result.then(
        () => { BrowserContextStorage.restore(beforeRun); },
        () => { BrowserContextStorage.restore(beforeRun); }
      );
      return result;
    }

    BrowserContextStorage.restore(beforeRun);
    return result;
  }

  getStore(): Map<string, unknown> | undefined {
    const result = BrowserContextStorage.#activeStores.get(this.#token);
    return result;
  }

  run<TResult>(store: Map<string, unknown>, callback: () => TResult): TResult {
    const result = BrowserContextStorage.#run(this.#token, store, callback);
    return result;
  }

  await<TResult>(
    store: Map<string, unknown>,
    value: TResult | PromiseLike<TResult>
  ): Promise<Awaited<TResult>> {
    BrowserContextStorage.activate(this.#token, store);
    const activeStores = BrowserContextStorage.capture();
    BrowserContextStorage.clear();

    const result = Promise.resolve(value).then(
      (resolvedValue) => {
        BrowserContextStorage.restore(activeStores);
        return resolvedValue;
      },
      (error: unknown) => {
        BrowserContextStorage.restore(activeStores);
        throw error;
      }
    );
    return result;
  }

  bind<TArguments extends readonly unknown[], TResult>(
    store: Map<string, unknown>,
    callback: (...argumentList: TArguments) => TResult
  ): (...argumentList: TArguments) => TResult {
    const token = this.#token;
    const result = (...argumentList: TArguments): TResult => {
      const callbackResult = BrowserContextStorage.#run(token, store, () => {
        const callbackValue = callback(...argumentList);
        return callbackValue;
      });
      return callbackResult;
    };
    return result;
  }
}
