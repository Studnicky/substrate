import type { EntityStateInterface } from './EntityStateInterface.js';

/** Pure normalized entity-state transformations and selectors. */
export class EntityCollection {
  public static empty<TEntity extends object>(): EntityStateInterface<TEntity> {
    const result: EntityStateInterface<TEntity> = { 'entities': {}, 'ids': [] };

    return result;
  }

  public static getAll<TEntity extends object>(state: EntityStateInterface<TEntity>): readonly TEntity[] {
    const result: TEntity[] = [];
    const length = state.ids.length;
    for (let index = 0; index < length; index += 1) {
      const id = state.ids[index];
      if (id === undefined) {
        continue;
      }
      const entity = state.entities[id];
      if (entity !== undefined) {
        result.push(entity);
      }
    }

    return result;
  }

  public static removeMany<TEntity extends object>(state: EntityStateInterface<TEntity>, ids: readonly string[]): EntityStateInterface<TEntity> {
    const removals = new Set(ids);
    if (removals.size === 0) {
      return state;
    }

    const retainedIds = state.ids.filter((id): boolean => {
      const result = !removals.has(id);

      return result;
    });
    if (retainedIds.length === state.ids.length) {
      return state;
    }

    const result = EntityCollection.fromIds(state, retainedIds);

    return result;
  }

  public static removeOne<TEntity extends object>(state: EntityStateInterface<TEntity>, id: string): EntityStateInterface<TEntity> {
    if (!Object.hasOwn(state.entities, id)) {
      return state;
    }

    const retainedIds = state.ids.filter((candidate): boolean => {
      const result = candidate !== id;

      return result;
    });
    const result = EntityCollection.fromIds(state, retainedIds);

    return result;
  }

  public static setAll<TEntity extends object>(entities: readonly TEntity[], selectId: (entity: TEntity) => string): EntityStateInterface<TEntity> {
    const state = EntityCollection.empty<TEntity>();
    const result = EntityCollection.upsertMany(state, entities, selectId);

    return result;
  }

  public static upsertMany<TEntity extends object>(state: EntityStateInterface<TEntity>, entities: readonly TEntity[], selectId: (entity: TEntity) => string): EntityStateInterface<TEntity> {
    if (entities.length === 0) {
      return state;
    }

    const nextEntities: Record<string, TEntity> = { ...state.entities };
    const nextIds = [...state.ids];
    const length = entities.length;
    for (let index = 0; index < length; index += 1) {
      const entity = entities[index];
      if (entity === undefined) {
        continue;
      }
      const id = selectId(entity);
      if (!Object.hasOwn(nextEntities, id)) {
        nextIds.push(id);
      }
      Object.defineProperty(nextEntities, id, { 'configurable': true, 'enumerable': true, 'value': entity, 'writable': true });
    }

    const result: EntityStateInterface<TEntity> = { 'entities': nextEntities, 'ids': nextIds };

    return result;
  }

  public static upsertOne<TEntity extends object>(state: EntityStateInterface<TEntity>, entity: TEntity, selectId: (entity: TEntity) => string): EntityStateInterface<TEntity> {
    const entities = { ...state.entities };
    const id = selectId(entity);
    const ids = Object.hasOwn(entities, id) ? state.ids : [...state.ids, id];
    Object.defineProperty(entities, id, { 'configurable': true, 'enumerable': true, 'value': entity, 'writable': true });
    const result: EntityStateInterface<TEntity> = { 'entities': entities, 'ids': ids };

    return result;
  }

  private static fromIds<TEntity extends object>(state: EntityStateInterface<TEntity>, ids: readonly string[]): EntityStateInterface<TEntity> {
    const entities: Record<string, TEntity> = {};
    const length = ids.length;
    for (let index = 0; index < length; index += 1) {
      const id = ids[index];
      if (id === undefined) {
        continue;
      }
      const entity = state.entities[id];
      if (entity !== undefined) {
        Object.defineProperty(entities, id, { 'configurable': true, 'enumerable': true, 'value': entity, 'writable': true });
      }
    }

    const result: EntityStateInterface<TEntity> = { 'entities': entities, 'ids': ids };

    return result;
  }
}
