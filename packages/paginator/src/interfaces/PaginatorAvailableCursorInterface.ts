import type { PaginatorAvailableCursorDiscriminantEntity } from '../entities/PaginatorAvailableCursorDiscriminantEntity.js';

/** Readonly cursor input that carries the cursor for another page. */
export interface PaginatorAvailableCursorInterface<TCursor> extends PaginatorAvailableCursorDiscriminantEntity.Type {
  readonly 'cursor': TCursor;
  readonly 'exhausted': PaginatorAvailableCursorDiscriminantEntity.Type['exhausted'];
}
