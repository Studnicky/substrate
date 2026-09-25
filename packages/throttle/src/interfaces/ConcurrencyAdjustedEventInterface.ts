import type { ConcurrencyAdjustedEventEntity } from '../entities/ConcurrencyAdjustedEventEntity.js';

/** `newLimit`/`previousLimit` are computed internally from live state; never externally validated. */
export interface ConcurrencyAdjustedEventInterface {
  readonly 'newLimit': number;
  readonly 'previousLimit': number;
  readonly 'type': ConcurrencyAdjustedEventEntity.Type['type'];
}
