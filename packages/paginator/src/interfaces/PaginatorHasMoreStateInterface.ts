import type { PaginatorHasMoreStateDiscriminantEntity } from '../entities/PaginatorHasMoreStateDiscriminantEntity.js';

/** Readonly state that retains received pages and the cursor for another page. */
export interface PaginatorHasMoreStateInterface<TPage, TCursor> extends PaginatorHasMoreStateDiscriminantEntity.Type {
  readonly 'cursor': TCursor;
  readonly 'pages': TPage[];
  readonly 'variant': PaginatorHasMoreStateDiscriminantEntity.Type['variant'];
}
