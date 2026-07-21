/**
 * @studnicky/paginator
 *
 * Cursor/page-list state tracker for paginated data sources.
 */

export { PaginatorAvailableCursorDiscriminantEntity } from './entities/PaginatorAvailableCursorDiscriminantEntity.js';
export { PaginatorExhaustedCursorEntity } from './entities/PaginatorExhaustedCursorEntity.js';
export { PaginatorExhaustedStateDiscriminantEntity } from './entities/PaginatorExhaustedStateDiscriminantEntity.js';
export { PaginatorHasMoreStateDiscriminantEntity } from './entities/PaginatorHasMoreStateDiscriminantEntity.js';
export { PaginatorIdleStateEntity } from './entities/PaginatorIdleStateEntity.js';
export { PaginatorPageReceivedEventDiscriminantEntity } from './entities/PaginatorPageReceivedEventDiscriminantEntity.js';
export { PaginatorResetEventEntity } from './entities/PaginatorResetEventEntity.js';
export type { PaginatorAvailableCursorInterface } from './interfaces/PaginatorAvailableCursorInterface.js';
export type { PaginatorExhaustedStateInterface } from './interfaces/PaginatorExhaustedStateInterface.js';
export type { PaginatorHasMoreStateInterface } from './interfaces/PaginatorHasMoreStateInterface.js';
export type { PaginatorPageReceivedEventInterface } from './interfaces/PaginatorPageReceivedEventInterface.js';
export { Paginator } from './Paginator.js';
