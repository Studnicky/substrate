import type { PaginatorAvailableCursorEntity } from '../entities/PaginatorAvailableCursorEntity.js';

/** Typed cursor composition for a paginator with an application-specific cursor type. */
export interface PaginatorAvailableCursorInterface<TCursor> extends PaginatorAvailableCursorEntity.Type {
  readonly 'cursor': TCursor;
}
