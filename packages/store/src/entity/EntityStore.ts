import { Clone } from '@studnicky/json/browser';

import type { StoreListenerInterface } from '../interfaces/StoreListenerInterface.js';
import type { EntityStateInterface } from './EntityStateInterface.js';
import type { EntityStoreOptionsInterface } from './EntityStoreOptionsInterface.js';

import { EntityCollection } from './EntityCollection.js';

/** Entity-oriented facade that delegates state ownership to StoreInterface. */
export class EntityStore<TEntity extends object> {
  readonly #selectId: (entity: TEntity) => string;
  readonly #sortComparer: ((left: TEntity, right: TEntity) => number) | undefined;
  readonly #store: EntityStoreOptionsInterface<TEntity>['store'];

  public static create<TEntity extends object>(options: EntityStoreOptionsInterface<TEntity>): EntityStore<TEntity> {
    const result = new EntityStore(options);

    return result;
  }

  private constructor(options: EntityStoreOptionsInterface<TEntity>) {
    this.#selectId = options.selectId;
    this.#sortComparer = options.sortComparer;
    this.#store = options.store;
  }

  public get size(): number {
    const entities = EntityCollection.getAll(this.#store.getSnapshot());
    const result = entities.length;

    return result;
  }

  public getAll(): readonly TEntity[] {
    const state = this.#store.getSnapshot();
    const entities = EntityCollection.getAll(state);
    const result = this.#sortComparer === undefined ? entities : entities.toSorted(this.#sortComparer);

    return result;
  }

  public getById(id: string): TEntity | undefined {
    const entity = this.#store.getSnapshot().entities[id];
    const result = entity === undefined ? undefined : Clone.deep(entity);

    return result;
  }

  public getIds(): readonly string[] {
    const result = Array.from(this.#store.getSnapshot().ids);

    return result;
  }

  public async removeMany(ids: readonly string[]): Promise<number> {
    let removed = 0;
    await this.#store.update((snapshot): EntityStateInterface<TEntity> => {
      const result = EntityCollection.removeMany(snapshot, ids);
      removed = snapshot.ids.length - result.ids.length;

      return result;
    });

    return removed;
  }

  public async removeOne(id: string): Promise<boolean> {
    let removed = false;
    await this.#store.update((snapshot): EntityStateInterface<TEntity> => {
      const result = EntityCollection.removeOne(snapshot, id);
      removed = !Object.is(result, snapshot);

      return result;
    });

    return removed;
  }

  public async setAll(entities: readonly TEntity[]): Promise<void> {
    const detached = Clone.deep(entities);
    await this.#store.update((): EntityStateInterface<TEntity> => {
      const result = EntityCollection.setAll(detached, this.#selectId);

      return result;
    });
  }

  public subscribe(listener: StoreListenerInterface<EntityStateInterface<TEntity>>): () => void {
    const result = this.#store.subscribe(listener);

    return result;
  }

  public async upsertMany(entities: readonly TEntity[]): Promise<void> {
    const detached = Clone.deep(entities);
    await this.#store.update((snapshot): EntityStateInterface<TEntity> => {
      const result = EntityCollection.upsertMany(snapshot, detached, this.#selectId);

      return result;
    });
  }

  public async upsertOne(entity: TEntity): Promise<void> {
    const detached = Clone.deep(entity);
    await this.#store.update((snapshot): EntityStateInterface<TEntity> => {
      const result = EntityCollection.upsertOne(snapshot, detached, this.#selectId);

      return result;
    });
  }
}
