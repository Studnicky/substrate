/**
 * Fixed-capacity ring buffer with O(1) push and shift operations.
 *
 * By default (overflow: 'overwrite') the buffer evicts the oldest item when
 * full, maintaining a fixed-size sliding window of the most recent N items.
 *
 * With overflow: 'grow' the buffer doubles capacity instead of evicting,
 * preserving every item at the cost of unbounded growth.
 *
 * Subclasses may override the protected hook methods to observe lifecycle
 * events. All hooks have no-op defaults — super() call is not required.
 *
 * Fire points:
 * - `onOverflow(item)` — in push(), when full in overwrite mode, before eviction (overwrite mode only)
 * - `onEvict(item)` — in push(), before the oldest item is overwritten (overwrite mode only)
 * - `onGrow(oldCapacity, newCapacity)` — end of grow(), after resize completes (grow mode only)
 * - `onPush(item)` — end of push(), after item is inserted and length updated
 * - `onShift(item)` — in shift(), before returning a defined item
 */

import type { CircularBufferOptionsEntity } from '../entities/CircularBufferOptionsEntity.js';
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
import { CircularBufferBuilder } from './CircularBufferBuilder.js';

export class CircularBuffer<T> implements CircularBufferInterface<T> {
  /**
   * Create a fluent builder for constructing a CircularBuffer instance.
   *
   * @returns A new CircularBufferBuilder
   *
   * @example
   * ```typescript
   * const buf = CircularBuffer.builder<number>().withCapacity(16).build();
   * ```
   */
  static builder<T>(): CircularBufferBuilder<T> {
    const result = CircularBufferBuilder.create<T>((options) => {
      const buffer = CircularBuffer.create<T>(options);
      return buffer;
    });
    return result;
  }

  /**
   * Create a new CircularBuffer instance.
   *
   * @param options - Construction options
   * @returns New CircularBuffer instance
   *
   * @example
   * ```typescript
   * const buf = CircularBuffer.create<number>({ capacity: 16 });
   * ```
   */
  static create<T>(options: CircularBufferOptionsEntity.Type = {}): CircularBuffer<T> {
    // `new this(...)` so subclass factories return the subclass instance.
    return new this(options);
  }

  protected count = INITIAL_BUFFER_COUNT;
  protected head = INITIAL_BUFFER_HEAD;
  protected items: (T | undefined)[];
  protected tail = INITIAL_BUFFER_TAIL;
  protected capacity: number;

  readonly #overflow: 'grow' | 'overwrite';

  /**
   * Create a new circular buffer.
   *
   * @param options - Construction options
   * @param options.capacity - Initial capacity (default: 128)
   * @param options.overflow - Overflow strategy: 'overwrite' evicts oldest (default), 'grow' doubles capacity
   */
  protected constructor(options: CircularBufferOptionsEntity.Type = {}) {
    const capacity = options.capacity ?? DEFAULT_BUFFER_CAPACITY;

    if (capacity <= 0 || !Number.isInteger(capacity)) {
      throw new CircularBufferError('capacity must be a positive integer');
    }

    this.capacity = capacity;
    this.items = Array.from<T | undefined>({ 'length': capacity });
    this.#overflow = options.overflow ?? 'overwrite';
  }

  /**
   * Double the buffer capacity when full.
   * Reorganizes items to maintain order.
   * Fire point: `onGrow` is called at the end after the resize completes.
   */
  protected grow(): void {
    const oldCapacity = this.capacity;
    const newCapacity = this.capacity * BUFFER_GROWTH_FACTOR;
    const newItems = Array.from<T | undefined>({ 'length': newCapacity });
    const length = this.count;
    const capacity = this.capacity;
    const head = this.head;
    const items = this.items;

    for (let i = FIRST_ARRAY_INDEX; i < length; i++) {
      newItems[i] = items[(head + i) % capacity];
    }

    this.items = newItems;
    this.head = INITIAL_BUFFER_HEAD;
    this.tail = length;
    this.capacity = newCapacity;

    this.onGrow(oldCapacity, newCapacity);
  }

  /**
   * Get the number of items in the buffer
   *
   * Getter required: count is mutated internally but exposed read-only
   */
  get length(): number {
    // Ensure non-negative (defensive - count should never be negative)
    const result = Math.max(this.count, EMPTY_LENGTH);
    return result;
  }

  /**
   * Called in push() when the buffer is full and overflow strategy is 'overwrite'.
   * Fires before onEvict — carries the incoming item, not the one being dropped.
   * Not called in grow mode (onGrow covers that path).
   * No-op default — override to observe overflow events.
   *
   * @param _item - The incoming item that triggered the overflow
   */
  protected onOverflow(_item: T): void {
    // no-op
  }

  /**
   * Called when an item is evicted during an overwrite push (overflow: 'overwrite').
   * Fires before the new item is written at the evicted slot.
   * No-op default — override to observe evictions.
   *
   * @param _item - The item that was evicted
   */
  protected onEvict(_item: T): void {
    // no-op
  }

  /**
   * Called at the end of grow(), after the buffer has been resized (overflow: 'grow' only).
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
   * length updated.
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
   * Add an item to the end of the buffer.
   * Time complexity: O(1) amortized (overwrite mode: always O(1))
   *
   * In overwrite mode (default): when full, evicts the oldest item and
   * overwrites its slot, advancing both head and tail. Length stays at capacity.
   *
   * In grow mode: when full, doubles capacity before inserting.
   *
   * @param item - Item to add
   */
  push(item: T): void {
    if (this.count === this.capacity) {
      if (this.#overflow === 'grow') {
        this.grow();
      } else {
        // overwrite: evict oldest, advance head, keep length at capacity
        this.onOverflow(item);
        const evicted = this.items[this.head];
        if (evicted !== undefined) {
          this.onEvict(evicted);
        }
        this.items[this.tail] = item;
        this.tail = (this.tail + INCREMENT_BY_ONE) % this.capacity;
        this.head = (this.head + INCREMENT_BY_ONE) % this.capacity;
        this.onPush(item);
        return;
      }
    }

    this.items[this.tail] = item;
    this.tail = (this.tail + INCREMENT_BY_ONE) % this.capacity;
    this.count++;

    this.onPush(item);
  }

  /**
   * Remove and return the first item from the buffer
   * Time complexity: O(1)
   *
   * @returns First item or undefined if buffer is empty
   */
  shift(): T | undefined {
    if (this.count === EMPTY_LENGTH) {
      return undefined;
    }

    const item = this.items[this.head];

    this.items[this.head] = undefined;
    this.head = (this.head + INCREMENT_BY_ONE) % this.capacity;
    this.count--;

    if (item !== undefined) {
      this.onShift(item);
    }

    return item;
  }
}
