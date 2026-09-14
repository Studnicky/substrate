import type { PaginatorHasMoreStateEntity } from '../entities/PaginatorHasMoreStateEntity.js';

/** Typed paginator-state composition for application-specific page and cursor values. */
export interface PaginatorHasMoreStateInterface<TPage, TCursor> extends PaginatorHasMoreStateEntity.Type {
  readonly 'cursor': TCursor;
  readonly 'pages': TPage[];
}
