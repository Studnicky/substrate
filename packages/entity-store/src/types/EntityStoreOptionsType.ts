/** Construction options for `EntityStore.create()`. */

// json-schema-uninexpressible: generic type parameters (TEntity, TId) and function-type fields (selectId, sortComparer), not plain JSON-serializable data
export type EntityStoreOptionsType<TEntity, TId extends PropertyKey = string> = {
  /** Derives the id under which an entity is stored. Called on every upsert. */
  'selectId': (entity: TEntity) => TId;
  /** When provided, `getAll()` returns entities sorted by this comparator instead of insertion order. */
  'sortComparer'?: (a: TEntity, b: TEntity) => number;
};
