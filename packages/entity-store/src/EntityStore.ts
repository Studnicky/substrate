import type { EntityStoreOptionsType } from './types/EntityStoreOptionsType.js';

import { EntityStoreBuilder } from './EntityStoreBuilder.js';

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
 * Overrides must not throw or block; hooks are called synchronously after the
 * relevant state mutation.
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
  readonly #entities: Map<TId, TEntity>;
  readonly #selectId: (entity: TEntity) => TId;
  readonly #sortComparer: ((a: TEntity, b: TEntity) => number) | undefined;

  static create<TEntity, TId extends PropertyKey = string>(
    options: EntityStoreOptionsType<TEntity, TId>
  ): EntityStore<TEntity, TId> {
    // `new this(...)` so subclass factories return the subclass instance.
    return new this(options);
  }

  static builder<TEntity = unknown, TId extends PropertyKey = string>(): EntityStoreBuilder<TEntity, TId> {
    const factory = (options: EntityStoreOptionsType<TEntity, TId>): EntityStore<TEntity, TId> => {
      const result = EntityStore.create<TEntity, TId>(options);
      return result;
    };
    const result = EntityStoreBuilder.create<TEntity, TId>(factory);
    return result;
  }

  protected constructor(deps: EntityStoreOptionsType<TEntity, TId>) {
    this.#entities = new Map();
    this.#selectId = deps.selectId;
    this.#sortComparer = deps.sortComparer;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override these to add logging, timing, or metrics. Overrides must not throw
  // or block; hooks fire synchronously after the relevant state mutation.
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

  /** Derives the id via `selectId`; inserts a new entity or overwrites an existing one. */
  public upsertOne(entity: TEntity): void {
    const id = this.#selectId(entity);
    this.#entities.set(id, entity);
    this.#invokeHook(() => { this.onUpsert(id, entity); });
  }

  /** Upserts every entity in array order. An empty array is a no-op. */
  public upsertMany(entities: readonly TEntity[]): void {
    for (const entity of entities) {
      this.upsertOne(entity);
    }
  }

  /** Removes the entity for `id`; returns whether it existed. */
  public removeOne(id: TId): boolean {
    const existed = this.#entities.delete(id);

    if (existed) {
      this.#invokeHook(() => { this.onRemove(id); });
    }

    return existed;
  }

  /** Removes each id in `ids`; returns the count actually removed. */
  public removeMany(ids: readonly TId[]): number {
    let removed = 0;

    for (const id of ids) {
      if (this.removeOne(id)) {
        removed += 1;
      }
    }

    return removed;
  }

  /** Replaces the entire collection with `entities`, deriving ids via `selectId`. */
  public setAll(entities: readonly TEntity[]): void {
    this.#entities.clear();

    for (const entity of entities) {
      const id = this.#selectId(entity);
      this.#entities.set(id, entity);
    }

    this.#invokeHook(() => { this.onReplaceAll(this.#entities.size); });
  }

  /** Returns every entity, sorted by `sortComparer` if configured, else in insertion order. */
  public getAll(): readonly TEntity[] {
    const result = Array.from(this.#entities.values());

    if (this.#sortComparer !== undefined) {
      result.sort(this.#sortComparer);
    }

    return result;
  }

  /** Returns the entity for `id`, or `undefined` if absent. */
  public getById(id: TId): TEntity | undefined {
    const result = this.#entities.get(id);
    return result;
  }

  /** Returns every id currently stored, in insertion order. */
  public getIds(): readonly TId[] {
    const result = Array.from(this.#entities.keys());
    return result;
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }
}
