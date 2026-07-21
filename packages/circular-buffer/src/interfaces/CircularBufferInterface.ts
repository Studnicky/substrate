/**
 * Interface for circular buffer queue operations
 */
import type { CircularBufferStateEntity } from '../entities/CircularBufferStateEntity.js';

export interface CircularBufferInterface<T> {
  /**
   * Get the number of items in the buffer
   */
  readonly 'length': CircularBufferStateEntity.Type['length'];

  /**
   * Add an item to the end of the buffer
   * @param item - Item to add
   */
  push(item: T): void;

  /**
   * Remove and return the first item from the buffer
   * @returns First item or undefined if buffer is empty
   */
  shift(): T | undefined;

  /**
   * Add an item to the front of the buffer
   * @param item - Item to add
   */
  unshift(item: T): void;
}
