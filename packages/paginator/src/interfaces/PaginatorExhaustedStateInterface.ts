import type { PaginatorExhaustedStateEntity } from '../entities/PaginatorExhaustedStateEntity.js';

/** Typed paginator-state composition for application-specific page values. */
export interface PaginatorExhaustedStateInterface<TPage> extends PaginatorExhaustedStateEntity.Type {
  readonly 'pages': TPage[];
}
