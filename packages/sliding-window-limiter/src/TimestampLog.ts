/**
 * Internal timestamp queue for the 'log' algorithm.
 *
 * `CircularBuffer` only exposes `push`/`shift`/`length` — pruning stale
 * entries from the front needs a non-destructive peek first (ascending
 * insertion order means only the front can ever be stale). Subclassing
 * reaches the protected `items`/`head` fields rather than duplicating
 * the ring-buffer arithmetic.
 */

import { CircularBuffer } from '@studnicky/circular-buffer';

export class TimestampLog extends CircularBuffer<number> {
  /** Construct a TimestampLog with the given fixed capacity. */
  static make(capacity: number): TimestampLog {
    return new this({ 'capacity': capacity });
  }

  /** Returns the oldest (front) timestamp without removing it, or undefined if empty. */
  peek(): number | undefined {
    if (this.length === 0) {
      return undefined;
    }
    const result = this.items[this.head];
    return result;
  }
}
