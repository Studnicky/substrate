import { type HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { EntityStoreOptionsInterface } from './interfaces/EntityStoreOptionsInterface.js';

/**
 * Normalized, ID-indexed entity collection — the RTK `createEntityAdapter` shape
 * (`upsertOne`/`upsertMany`/`removeOne`/`removeMany`/`setAll`, O(1) lookup by id,
 * ordered iteration) without RTK Query's caching/fetch-lifecycle machinery.
 *
 * Deliberately unbounded and non-evicting: there is no capacity limit, no TTL,
 * and no cache-tag invalidation. This is a normalized CRUD container, not a
 * cache — for eviction/TTL semantics, see `@studnicky/cache`'s `LruCache`.
 *
 * The base class performs NO observability of its own — it exposes protected
 * lifecycle hooks that a consumer overrides to add logging, timing, or metrics.
 * A hook that throws or rejects does not corrupt the store or abort the
 * caller: the failure is recorded (see `hookErrorCount`/`getHookErrors()`)
 * instead of propagating. Hooks still run inside an awaited path, so an
 * override should not perform long blocking work.
 *
 * @example Adding observability via hooks
 * ```typescript
 * class ObservedStore extends EntityStore<{ id: string; name: string }> {
 *   protected override onUpsert(id: string, entity: { id: string; name: string }): void {
 *     console.log(`[entity-store] upsert id=${id} name=${entity.name}`);
 *   }
 *   protected override onRemove(id: string): void {
 *     console.log(`[entity-store] remove id=${id}`);
 *   }
 * }
 * ```
 */
export class EntityStore<TEntity, TId extends PropertyKey = string> {
  /** Keeps completed mutations intact when a lifecycle hook fails. */
  static readonly #OwnedHookInvoker = class EntityStoreHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #entities: Map<TId, TEntity>;
  readonly #selectId: (entity: TEntity) => TId;
  readonly #sortComparer: ((a: TEntity, b: TEntity) => number) | undefined;
  protected readonly hooks: HookInvoker;
  #cachedSorted: TEntity[] | undefined;

  static create<TEntity, TId extends PropertyKey = string>(
    options: EntityStoreOptionsInterface<TEntity, TId>
  ): EntityStore<TEntity, TId> {
    // `new this(...)` so subclass factories return the subclass instance.
    return new this(options);
  }

  protected constructor(deps: EntityStoreOptionsInterface<TEntity, TId>) {
    this.#entities = new Map();
    this.#selectId = deps.selectId;
    this.#sortComparer = deps.sortComparer;
    this.hooks = new EntityStore.#OwnedHookInvoker();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override these to add logging, timing, or metrics. A throwing override is
  // recorded via `onHookError` rather than propagated; see class doc comment.
  // ---------------------------------------------------------------------------

  /** Fires once per entity from `upsertOne`/`upsertMany`, after the entity is stored. */
  protected onUpsert(_id: TId, _entity: TEntity): void {}

  /** Fires when `removeOne`/`removeMany` removes an entity that actually existed. */
  protected onRemove(_id: TId): void {}

  /** Fires once from `setAll`, with the count of entities in the new collection. */
  protected onReplaceAll(_count: number): void {}

  /** Current entity count. */
  public get size(): number {
    const result = this.#entities.size;
    return result;
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  public get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns a defensive copy of every hook failure recorded since construction. */
  public getHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }

  /** Derives the id via `selectId`; inserts a new entity or overwrites an existing one. */
  public async upsertOne(entity: TEntity): Promise<void> {
    const retainedEntity = structuredClone(entity);
    const id = this.#selectId(retainedEntity);
    this.#entities.set(id, retainedEntity);
    this.#cachedSorted = undefined;
    await this.hooks.invokeAsync('onUpsert', () => {
      const result = this.onUpsert(id, entity);
      return result;
    });
  }

  /** Upserts every entity in array order. An empty array is a no-op. */
  public async upsertMany(entities: readonly TEntity[]): Promise<void> {
    for (const entity of entities) {
      await this.upsertOne(entity);
    }
  }

  /** Removes the entity for `id`; returns whether it existed. */
  public async removeOne(id: TId): Promise<boolean> {
    const existed = this.#entities.delete(id);

    if (existed) {
      this.#cachedSorted = undefined;
      await this.hooks.invokeAsync('onRemove', () => {
        const result = this.onRemove(id);
        return result;
      });
    }

    return existed;
  }

  /** Removes each id in `ids`; returns the count actually removed. */
  public async removeMany(ids: readonly TId[]): Promise<number> {
    let removed = 0;

    for (const id of ids) {
      if (await this.removeOne(id)) {
        removed += 1;
      }
    }

    return removed;
  }

  /** Replaces the entire collection with `entities`, deriving ids via `selectId`. */
  public async setAll(entities: readonly TEntity[]): Promise<void> {
    this.#entities.clear();

    for (const entity of entities) {
      const retainedEntity = structuredClone(entity);
      const id = this.#selectId(retainedEntity);
      this.#entities.set(id, retainedEntity);
    }

    this.#cachedSorted = undefined;
    await this.hooks.invokeAsync('onReplaceAll', () => {
      const result = this.onReplaceAll(this.#entities.size);
      return result;
    });
  }

  /** Returns every entity, sorted by `sortComparer` if configured, else in insertion order. */
  public getAll(): readonly TEntity[] {
    if (this.#sortComparer === undefined) {
      const result = structuredClone(Array.from(this.#entities.values()));
      return result;
    }

    if (this.#cachedSorted === undefined) {
      const sorted = Array.from(this.#entities.values());
      sorted.sort(this.#sortComparer);
      this.#cachedSorted = sorted;
    }

    const result = structuredClone(this.#cachedSorted ?? []);
    return result;
  }

  /** Returns the entity for `id`, or `undefined` if absent. */
  public getById(id: TId): TEntity | undefined {
    const entity = this.#entities.get(id);
    const result = entity === undefined ? undefined : structuredClone(entity);
    return result;
  }

  /** Returns every id currently stored, in insertion order. */
  public getIds(): readonly TId[] {
    const result = Array.from(this.#entities.keys());
    return result;
  }
}
