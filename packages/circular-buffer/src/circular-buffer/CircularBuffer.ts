/**
 * Circular buffer data structure for O(1) push and shift operations
 */

import type { CircularBufferInterface } from '../interfaces/CircularBufferInterface.js';

import {
  BUFFER_GROWTH_FACTOR,
  DEFAULT_BUFFER_CAPACITY,
  EMPTY_LENGTH,
  FIRST_ARRAY_INDEX,
  INCREMENT_BY_ONE,
  INITIAL_BUFFER_COUNT,
  INITIAL_BUFFER_HEAD,
  INITIAL_BUFFER_TAIL
} from '../constants/index.js';
import { CircularBufferError } from '../errors/index.js';

/**
 * Circular buffer with O(1) push and shift operations
 *
 * Provides constant-time queue operations by using a circular array
 * with head and tail pointers. Automatically grows capacity when full.
 *
 * Subclasses may override the protected hook methods to observe lifecycle
 * events. All hooks have no-op defaults — super() call is not required.
 *
 * Fire points:
 * - `onGrow(oldCapacity, newCapacity)` — end of grow(), after resize completes
 * - `onPush(item)` — end of push(), after item is inserted and length updated
 * - `onShift(item)` — in shift(), before returning a defined item
 */
export class CircularBuffer<T> implements CircularBufferInterface<T> {
  protected _length = INITIAL_BUFFER_COUNT;
  protected _head = INITIAL_BUFFER_HEAD;
  protected _items: (T | undefined)[];
  protected _tail = INITIAL_BUFFER_TAIL;
  protected _capacity: number;

  /**
   * Create a new circular buffer
   *
   * @param capacity - Initial capacity (default: 128)
   */
  constructor(capacity = DEFAULT_BUFFER_CAPACITY) {
    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new CircularBufferError('capacity must be a positive integer');
    }

    this._capacity = capacity;
    this._items = Array.from<T | undefined>({ 'length': capacity });
  }

  /**
   * Double the buffer capacity when full.
   * Reorganizes items to maintain order.
   * Fire point: `onGrow` is called at the end after the resize completes.
   */
  protected grow(): void {
    const oldCapacity = this._capacity;
    const newCapacity = this._capacity * BUFFER_GROWTH_FACTOR;
    const newItems = Array.from<T | undefined>({ 'length': newCapacity });

    for (let i = FIRST_ARRAY_INDEX; i < this._length; i++) {
      newItems[i] = this._items[(this._head + i) % this._capacity];
    }

    this._items = newItems;
    this._head = INITIAL_BUFFER_HEAD;
    this._tail = this._length;
    this._capacity = newCapacity;

    this.onGrow(oldCapacity, newCapacity);
  }

  /**
   * Get the number of items in the buffer
   *
   * Getter required: _length is mutated internally but exposed read-only
   */
  get length(): number {
    // Ensure non-negative (defensive - _length should never be negative)
    const result = Math.max(this._length, EMPTY_LENGTH);
    return result;
  }

  /**
   * Called at the end of grow(), after the buffer has been resized.
   * No-op default — override to observe capacity changes.
   *
   * @param _oldCapacity - Capacity before growth
   * @param _newCapacity - Capacity after growth
   */
  protected onGrow(_oldCapacity: number, _newCapacity: number): void {
    // no-op
  }

  /**
   * Called at the end of push(), after the item has been inserted and
   * length incremented.
   * No-op default — override to observe item insertions.
   *
   * @param _item - The item that was pushed
   */
  protected onPush(_item: T): void {
    // no-op
  }

  /**
   * Called in shift(), before returning a defined item.
   * Not called when the buffer is empty.
   * No-op default — override to observe item removals.
   *
   * @param _item - The item about to be returned
   */
  protected onShift(_item: T): void {
    // no-op
  }

  /**
   * Add an item to the end of the buffer
   * Time complexity: O(1) amortized
   *
   * @param item - Item to add
   */
  push(item: T): void {
    if (this._length === this._capacity) {
      this.grow();
    }

    this._items[this._tail] = item;
    this._tail = (this._tail + INCREMENT_BY_ONE) % this._capacity;
    this._length++;

    this.onPush(item);
  }

  /**
   * Remove and return the first item from the buffer
   * Time complexity: O(1)
   *
   * @returns First item or undefined if buffer is empty
   */
  shift(): T | undefined {
    if (this._length === EMPTY_LENGTH) {
      return undefined;
    }

    const item = this._items[this._head];

    this._items[this._head] = undefined;
    this._head = (this._head + INCREMENT_BY_ONE) % this._capacity;
    this._length--;

    if (item !== undefined) {
      this.onShift(item);
    }

    return item;
  }
}
