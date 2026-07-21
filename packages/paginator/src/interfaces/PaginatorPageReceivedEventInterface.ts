import type { PaginatorExhaustedCursorEntity } from '../entities/PaginatorExhaustedCursorEntity.js';
import type { PaginatorPageReceivedEventDiscriminantEntity } from '../entities/PaginatorPageReceivedEventDiscriminantEntity.js';
import type { PaginatorAvailableCursorInterface } from './PaginatorAvailableCursorInterface.js';

/** Readonly transition input carrying one fetched page and the source's cursor status. */
export interface PaginatorPageReceivedEventInterface<TPage, TCursor>
  extends PaginatorPageReceivedEventDiscriminantEntity.Type {
  readonly 'nextCursor': PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type;
  readonly 'page': TPage;
  readonly 'type': PaginatorPageReceivedEventDiscriminantEntity.Type['type'];
}
