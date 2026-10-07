import type { PaginatorExhaustedCursorEntity } from '../entities/PaginatorExhaustedCursorEntity.js';
import type { PaginatorPageReceivedEventEntity } from '../entities/PaginatorPageReceivedEventEntity.js';
import type { PaginatorAvailableCursorInterface } from './PaginatorAvailableCursorInterface.js';

/** Typed paginator-event composition for application-specific page and cursor values. */
export interface PaginatorPageReceivedEventInterface<TPage, TCursor> extends PaginatorPageReceivedEventEntity.Type {
  readonly 'nextCursor': PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type;
  readonly 'page': TPage;
}
