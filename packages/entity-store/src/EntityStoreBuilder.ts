import type { EntityStore } from './EntityStore.js';
import type { EntityStoreOptionsType } from './types/EntityStoreOptionsType.js';

export class EntityStoreBuilder<TEntity = unknown, TId extends PropertyKey = string> {
  static create<TEntity = unknown, TId extends PropertyKey = string>(
    create: (options: EntityStoreOptionsType<TEntity, TId>) => EntityStore<TEntity, TId>
  ): EntityStoreBuilder<TEntity, TId> {
    return new EntityStoreBuilder<TEntity, TId>(create);
  }

  readonly #create: (options: EntityStoreOptionsType<TEntity, TId>) => EntityStore<TEntity, TId>;
  #selectId?: (entity: TEntity) => TId;
  #sortComparer?: (a: TEntity, b: TEntity) => number;

  private constructor(create: (options: EntityStoreOptionsType<TEntity, TId>) => EntityStore<TEntity, TId>) {
    this.#create = create;
  }

  withSelectId(value: (entity: TEntity) => TId): this {
    this.#selectId = value;
    return this;
  }

  withSortComparer(value: (a: TEntity, b: TEntity) => number): this {
    this.#sortComparer = value;
    return this;
  }

  build(): EntityStore<TEntity, TId> {
    if (this.#selectId === undefined) {
      throw new Error('EntityStoreBuilder: selectId is required');
    }
    const options: EntityStoreOptionsType<TEntity, TId> = {
      'selectId': this.#selectId,
      ...(this.#sortComparer !== undefined && { 'sortComparer': this.#sortComparer })
    };
    return this.#create(options);
  }
}
