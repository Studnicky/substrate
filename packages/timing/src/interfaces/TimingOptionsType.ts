import type { PrecisionConfigType } from './PrecisionConfigType.js';

/**
 * Options for creating a Timing instance.
 *
 * @public
 */
export type TimingOptionsType = {
  /**
   * Maximum number of events to store.
   * When exceeded, oldest events are evicted (LRU behavior).
   */
  'maxEvents'?: number;

  /**
   * Decimal precision configuration per time unit.
   */
  'precision'?: PrecisionConfigType;
};
