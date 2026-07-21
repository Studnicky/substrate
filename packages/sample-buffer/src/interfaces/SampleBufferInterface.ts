import type { SampleBufferStateEntity } from '../entities/SampleBufferStateEntity.js';

/**
 * Interface for a fixed-capacity sliding-window numeric sample buffer
 */
export interface SampleBufferInterface {
  /**
   * Clear all samples from the buffer
   */
  clear(): void;

  /**
   * Whether the buffer has reached capacity
   */
  readonly 'isFull': SampleBufferStateEntity.Type['isFull'];

  /**
   * Number of samples in the buffer
   */
  readonly 'length': SampleBufferStateEntity.Type['length'];

  /**
   * Calculate a percentile from the buffered samples
   * @param pct - Percentile to calculate (0-100)
   * @returns Percentile value or undefined if buffer is empty
   */
  percentile(pct: number): number | undefined;

  /**
   * Add a numeric sample to the buffer
   * @param value - Sample value
   */
  push(value: number): void;
}
