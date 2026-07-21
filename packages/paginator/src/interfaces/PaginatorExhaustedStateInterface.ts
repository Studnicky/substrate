import type { PaginatorExhaustedStateDiscriminantEntity } from '../entities/PaginatorExhaustedStateDiscriminantEntity.js';

/** Readonly state after the source reports that no further pages are available. */
export interface PaginatorExhaustedStateInterface<TPage> extends PaginatorExhaustedStateDiscriminantEntity.Type {
  readonly 'pages': TPage[];
  readonly 'variant': PaginatorExhaustedStateDiscriminantEntity.Type['variant'];
}
