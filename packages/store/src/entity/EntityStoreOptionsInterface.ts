import type { StoreInterface } from '../interfaces/StoreInterface.js';
import type { EntityStateInterface } from './EntityStateInterface.js';

/** Dependencies for an entity-oriented facade over a Store state boundary. */
export interface EntityStoreOptionsInterface<TEntity extends object> {
  readonly 'selectId': (entity: TEntity) => string;
  readonly 'sortComparer'?: (left: TEntity, right: TEntity) => number;
  readonly 'store': StoreInterface<EntityStateInterface<TEntity>>;
}
