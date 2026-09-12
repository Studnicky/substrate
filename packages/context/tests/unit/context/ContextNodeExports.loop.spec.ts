import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { describe, it } from 'node:test';

import * as browserExports from '../../../src/browser/index.js';
import * as nodeExports from '../../../src/node/index.js';
import { Context } from '../../../src/node/index.js';
import type { ContextStorageInterface } from '../../../src/interfaces/index.js';

class OverrideStorage implements ContextStorageInterface {
  readonly #storage: AsyncLocalStorage<Map<string, unknown>> = new AsyncLocalStorage<Map<string, unknown>>();

  getStore(): Map<string, unknown> | undefined {
    return this.#storage.getStore();
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

describe('Context runtime entrypoints', () => {
  it('exports the same runtime symbols from node and browser', () => {
    assert.deepStrictEqual(Object.keys(nodeExports).toSorted(), ['Context', 'ContextAsyncRuntime', 'ContextConfigError', 'ContextError']);
    assert.deepStrictEqual(Object.keys(browserExports).toSorted(), Object.keys(nodeExports).toSorted());
  });

  it('uses an injected storage host ahead of the Node default', () => {
    const context = Context.create({ 'name': 'override' }, new OverrideStorage());
    const scope = context.initialize({ 'value': 'injected' });

    scope.execute(() => {
      assert.strictEqual(context.get('value'), 'injected');
    });
  });
});
