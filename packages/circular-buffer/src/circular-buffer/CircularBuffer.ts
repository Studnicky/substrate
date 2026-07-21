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
 * `unshift()` inserts at the front (head) instead of the back (tail) —
 * useful for preempting the queue with a follow-up item. It mirrors push()'s
 * overflow/growth semantics: in overwrite mode, a full buffer evicts from the
 * opposite end (tail) to make room at the front; in grow mode, it grows first.
 *
 * Fire points — in overwrite mode, push()/unshift() fully commit head/tail/items
 * for the operation (including the eviction) before any hook fires, so a
 * reentrant push()/unshift() from within a hook observes a consistent buffer:
 * - `onOverflow(item)` — in push()/unshift(), when full in overwrite mode, after the eviction and insertion are committed (overwrite mode only)
 * - `onEvict(item)` — in push()/unshift(), after the displaced item's slot has been overwritten (overwrite mode only)
 * - `onGrow(oldCapacity, newCapacity)` — end of grow(), after resize completes (grow mode only)
 * - `onPush(item)` — end of push() or unshift(), after the item is inserted and length updated
 * - `onShift(item)` — in shift(), before returning a defined item
 *
 * Each fire point is invoked through a `HookInvoker` instance held as the
 * `hooks` field, from `@studnicky/errors`. push()/shift()/unshift() stay
 * synchronous — `invoke` never `await`s at the call site, so a hook that resolves
 * synchronously never touches the Promise machinery. A hook that throws
 * surfaces as a `HookInvocationError` (from `@studnicky/errors`) carrying
 * the hook name, propagated synchronously out of push()/shift()/unshift().
 * An unexpectedly-async hook override is also handled safely: its eventual
 * rejection routes through `onHookError` via a guaranteed `.catch`, so it
 * can never produce an unhandled promise rejection or crash the process.
 */

import { HookInvoker, ReentrantHookInvocationError } from '@studnicky/errors';

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

interface CircularBufferSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class CircularBufferInstance {
  static belongsTo<TInstance>(
    constructor: CircularBufferSubclassInterface<TInstance>,
    value: unknown
  ): value is TInstance {
    return value instanceof constructor;
  }
}

export class CircularBuffer<T> implements CircularBufferInterface<T> {
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
  static create<
    T,
    TInstance extends CircularBuffer<T> = CircularBuffer<T>
  >(
    this: CircularBufferSubclassInterface<TInstance>,
    options: CircularBufferOptionsEntity.Type = {}
  ): TInstance {
    const result: unknown = Reflect.construct(this, [options]);
    if (!CircularBufferInstance.belongsTo(this, result)) {
      throw new TypeError('CircularBuffer.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected count = INITIAL_BUFFER_COUNT;
  protected head = INITIAL_BUFFER_HEAD;
  protected items: (T | undefined)[];
  protected tail = INITIAL_BUFFER_TAIL;
  protected capacity: number;
  protected readonly hooks: HookInvoker = new HookInvoker({ 'detectReentrancy': true });

  readonly #overflow: 'grow' | 'overwrite';

  // Guards push()/unshift()/shift(): true for the entire duration of one of
  // these calls (mutation through every hook it fires), so a hook override
  // that reentrantly calls back into any of them on this same instance is
  // rejected at entry — before it can mutate head/tail/items — rather than
  // relying solely on HookInvoker's own reentrancy check, which only trips
  // once the reentrant call reaches its own `hooks.invoke`, by which point
  // it has already mutated shared state.
  #dispatching = false;

  // Separate flag for grow(): grow() is legitimately called from inside
  // push()/unshift() while #dispatching is already true, so it cannot share
  // that flag. This one guards only against onGrow reentrantly calling
  // grow() again on the same instance.
  #growing = false;

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
    if (this.#growing) {
      throw new ReentrantHookInvocationError('grow');
    }
    this.#growing = true;
    try {
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

      this.hooks.invoke('onGrow', () => {
        const result = this.onGrow(oldCapacity, newCapacity);
        return result;
      });
    } finally {
      this.#growing = false;
    }
  }

  /**
   * Get the number of items in the buffer
   *
   * Getter required: count is mutated internally but exposed read-only
   */
  get length(): number {
    return this.count;
  }

  /**
   * Called in push()/unshift() when the buffer is full and overflow strategy
   * is 'overwrite'. Fires after the eviction and insertion are fully
   * committed (head/tail/items), and before onEvict — carries the incoming
   * item, not the one being dropped.
   * Not called in grow mode (onGrow covers that path).
   * No-op default — override to observe overflow events.
   *
   * @param _item - The incoming item that triggered the overflow
   */
  protected onOverflow(_item: T): void {
    // no-op
  }

  /**
   * Called when an item is evicted during an overwrite push/unshift
   * (overflow: 'overwrite'). Fires after the evicted slot has been
   * overwritten by the new item and head/tail/items are fully committed.
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
   * Called at the end of push() or unshift(), after the item has been
   * inserted and length updated. Both entry points share this hook — from an
   * observer's perspective, "a new item entered the buffer" is the same
   * event regardless of which end it entered from.
   * No-op default — override to observe item insertions.
   *
   * @param _item - The item that was pushed or unshifted
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
    if (this.#dispatching) {
      throw new ReentrantHookInvocationError('push');
    }
    this.#dispatching = true;
    try {
      if (this.count === this.capacity) {
        if (this.#overflow === 'grow') {
          this.grow();
        } else {
          // overwrite: evict oldest, advance head, keep length at capacity.
          // Buffer is full (count === capacity), so the slot at head always
          // holds a real item — occupancy is already known, no value check needed.
          const evicted = this.items[this.head]!;
          this.head = (this.head + INCREMENT_BY_ONE) % this.capacity;
          this.#writeTail(item);

          // State (head/tail/items) is fully committed above before any hook
          // fires, so a reentrant push()/unshift()/shift() from
          // onOverflow/onEvict observes a consistent buffer instead of a
          // half-advanced one. The #dispatching guard above additionally
          // rejects such a reentrant call before it can mutate anything.
          this.hooks.invoke('onOverflow', () => {
            const result = this.onOverflow(item);
            return result;
          });
          this.hooks.invoke('onEvict', () => {
            const result = this.onEvict(evicted);
            return result;
          });
          this.hooks.invoke('onPush', () => {
            const result = this.onPush(item);
            return result;
          });
          return;
        }
      }

      this.count++;
      this.#appendItem(item);
    } finally {
      this.#dispatching = false;
    }
  }

  /**
   * Shared tail-write step used by both the generic append path and the
   * overwrite-eviction path: writes `item` at `tail` and advances `tail`.
   * Does not fire `onPush` — callers invoke that hook directly once all state
   * for the operation is committed.
   */
  #writeTail(item: T): void {
    this.items[this.tail] = item;
    this.tail = (this.tail + INCREMENT_BY_ONE) % this.capacity;
  }

  /**
   * Writes `item` at `tail`, advances `tail`, then fires `onPush`. Used by
   * the non-overflow append path where there is no eviction to sequence
   * around.
   */
  #appendItem(item: T): void {
    this.#writeTail(item);
    this.hooks.invoke('onPush', () => {
      const result = this.onPush(item);
      return result;
    });
  }

  /**
   * Add an item to the front of the buffer.
   * Time complexity: O(1) amortized (overwrite mode: always O(1))
   *
   * In overwrite mode (default): when full, evicts from the tail (the
   * opposite end from insertion) to make room, retreating tail. Length stays
   * at capacity.
   *
   * In grow mode: when full, doubles capacity before inserting.
   *
   * @param item - Item to add
   */
  unshift(item: T): void {
    if (this.#dispatching) {
      throw new ReentrantHookInvocationError('unshift');
    }
    this.#dispatching = true;
    try {
      if (this.count === this.capacity) {
        if (this.#overflow === 'grow') {
          this.grow();
        } else {
          // overwrite: evict from tail (opposite end from insertion), retreat
          // tail, keep length at capacity.
          this.tail = (this.tail - INCREMENT_BY_ONE + this.capacity) % this.capacity;
          // Buffer is full (count === capacity), so the slot before tail always
          // holds a real item — occupancy is already known, no value check needed.
          const evicted = this.items[this.tail]!;
          this.#writeHead(item);

          // State (head/tail/items) is fully committed above before any hook
          // fires, so a reentrant push()/unshift()/shift() from
          // onOverflow/onEvict observes a consistent buffer instead of a
          // half-advanced one. The #dispatching guard above additionally
          // rejects such a reentrant call before it can mutate anything.
          this.hooks.invoke('onOverflow', () => {
            const result = this.onOverflow(item);
            return result;
          });
          this.hooks.invoke('onEvict', () => {
            const result = this.onEvict(evicted);
            return result;
          });
          this.hooks.invoke('onPush', () => {
            const result = this.onPush(item);
            return result;
          });
          return;
        }
      }

      this.count++;
      this.#prependItem(item);
    } finally {
      this.#dispatching = false;
    }
  }

  /**
   * Shared head-write step used by both the generic prepend path and the
   * overwrite-eviction path: retreats `head` and writes `item` at the new
   * head. Does not fire `onPush` — callers invoke that hook directly once all
   * state for the operation is committed.
   */
  #writeHead(item: T): void {
    this.head = (this.head - INCREMENT_BY_ONE + this.capacity) % this.capacity;
    this.items[this.head] = item;
  }

  /**
   * Retreats `head`, writes `item` at the new head, then fires `onPush`.
   * Used by the non-overflow prepend path where there is no eviction to
   * sequence around.
   */
  #prependItem(item: T): void {
    this.#writeHead(item);
    this.hooks.invoke('onPush', () => {
      const result = this.onPush(item);
      return result;
    });
  }

  /**
   * Remove and return the first item from the buffer
   * Time complexity: O(1)
   *
   * @returns First item or undefined if buffer is empty
   */
  shift(): T | undefined {
    if (this.#dispatching) {
      throw new ReentrantHookInvocationError('shift');
    }
    if (this.count === EMPTY_LENGTH) {
      return undefined;
    }

    this.#dispatching = true;
    try {
      // Past the EMPTY_LENGTH guard above, count > 0 means the slot at head
      // always holds a real item — occupancy is already known, no value check needed.
      const item = this.items[this.head]!;

      this.items[this.head] = undefined;
      this.head = (this.head + INCREMENT_BY_ONE) % this.capacity;
      this.count--;

      this.hooks.invoke('onShift', () => {
        const result = this.onShift(item);
        return result;
      });

      return item;
    } finally {
      this.#dispatching = false;
    }
  }
}
