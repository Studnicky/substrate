
import { Coalesce, HookInvoker, Predicates, RuntimeError } from '#runtime';

import { LruCache } from '../LruCache.js';

interface MemoizeDependenciesInterface<TArgumentList extends unknown[], TResult> {
  readonly 'cache': LruCache<string, TResult>;
  readonly 'callback': (...argumentList: TArgumentList) => TResult | Promise<TResult>;
  readonly 'keyDeriver': (...argumentList: TArgumentList) => string;
}

interface MemoizeInstanceShapeInterface {
  clear(): void;
}

interface MemoizeLookupInterface<TResult> {
  readonly 'found': boolean;
  readonly 'value': TResult | undefined;
}

interface MemoizeSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class MemoizeCacheLookup {
  static isHit<TResult>(
    lookup: MemoizeLookupInterface<TResult>
  ): lookup is { readonly 'found': true; readonly 'value': TResult } {
    return lookup.found;
  }
}

class MemoizeHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}

/**
 * Caches successful callback results by caller-derived key and coalesces concurrent calls for that key.
 */
export class Memoize<TArgumentList extends unknown[], TResult> {
  static readonly #OwnedCoalesce = class MemoizeCoalesce<
    TOwnerArgumentList extends unknown[],
    TOwnerResult
  > extends Coalesce<TOwnerResult> {
    readonly #owner: Memoize<TOwnerArgumentList, TOwnerResult>;

    constructor(owner: Memoize<TOwnerArgumentList, TOwnerResult>) {
      super();
      this.#owner = owner;
    }

    protected override onCoalesceStart(key: string): void {
      super.onCoalesceStart(key);
      const argumentList = this.#owner.#pendingArgumentListByKey.get(key);
      if (argumentList === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoMiss', () => {
        const result = this.#owner.onMemoMiss(key, argumentList);
        return result;
      });
    }

    protected override onCoalesceJoin(key: string): void {
      super.onCoalesceJoin(key);
      const argumentList = this.#owner.#pendingArgumentListByKey.get(key);
      if (argumentList === undefined) {
        return;
      }
      this.#owner.hooks.invoke('onMemoCoalesced', () => {
        const result = this.#owner.onMemoCoalesced(key, argumentList);
        return result;
      });
    }
  };

  static create<
    TArgumentList extends unknown[],
    TResult,
    TInstance extends MemoizeInstanceShapeInterface = Memoize<TArgumentList, TResult>
  >(
    this: MemoizeSubclassInterface<TInstance>,
    callback: (...argumentList: TArgumentList) => TResult | Promise<TResult>,
    cacheConfig: unknown,
    collaborators: { readonly 'keyDeriver': (...argumentList: TArgumentList) => string }
  ): TInstance {
    const dependencies: MemoizeDependenciesInterface<TArgumentList, TResult> = {
      'cache': LruCache.create<string, TResult>(cacheConfig),
      'callback': callback,
      'keyDeriver': collaborators.keyDeriver
    };
    const constructed: unknown = Reflect.construct(this, [dependencies]);

    if (!Predicates.isObjectLike(constructed) || !Predicates.isInstanceOf(constructed, this)) {
      throw RuntimeError.create('Memoize.create() must construct a Memoize instance');
    }

    return constructed;
  }

  readonly #cache: LruCache<string, TResult>;
  readonly #callback: (...argumentList: TArgumentList) => TResult | Promise<TResult>;
  readonly #coalesce: Coalesce<TResult>;
  readonly #keyDeriver: (...argumentList: TArgumentList) => string;
  readonly #pendingArgumentListByKey = new Map<string, TArgumentList>();
  protected readonly hooks: HookInvoker = new MemoizeHookInvoker();

  protected constructor(dependencies: MemoizeDependenciesInterface<TArgumentList, TResult>) {
    this.#cache = dependencies.cache;
    this.#callback = dependencies.callback;
    this.#coalesce = new Memoize.#OwnedCoalesce<TArgumentList, TResult>(this);
    this.#keyDeriver = dependencies.keyDeriver;
  }

  public async call(...argumentList: TArgumentList): Promise<TResult> {
    const key = this.#keyDeriver(...argumentList);
    const cached = this.#cache.tryGet(key);
    if (MemoizeCacheLookup.isHit(cached)) {
      await this.hooks.invokeAsync('onMemoHit', () => {
        const result = this.onMemoHit(key, argumentList);
        return result;
      });
      return cached.value;
    }

    this.#pendingArgumentListByKey.set(key, argumentList);
    try {
      const result = await this.#coalesce.run(key, () => {
        const resolved = Promise.resolve(this.#callback(...argumentList));
        return resolved;
      });
      this.#cache.set(key, result);
      return result;
    } finally {
      this.#pendingArgumentListByKey.delete(key);
    }
  }

  public invalidate(...argumentList: TArgumentList): void {
    this.#cache.delete(this.#keyDeriver(...argumentList));
  }

  public clear(): void {
    this.#cache.clear();
  }

  protected onMemoHit(_key: string, _argumentList: TArgumentList): void {}

  protected onMemoMiss(_key: string, _argumentList: TArgumentList): void {}

  protected onMemoCoalesced(_key: string, _argumentList: TArgumentList): void {}
}
