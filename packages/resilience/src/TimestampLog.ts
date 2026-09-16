/**
 * Internal weighted timestamp queue for the `log` algorithm.
 *
 * Each entry retains the token units admitted at one timestamp. Entries with
 * the same timestamp coalesce, while distinct timestamps remain separate so
 * each unit amount expires exactly at its own rolling-window boundary.
 */

import { CircularBuffer } from '@studnicky/circular-buffer/node';

export class TimestampLog extends CircularBuffer<{ readonly 'timestamp': number; readonly 'tokens': number }> {
  /** Adds weighted units, coalescing admissions recorded at the same timestamp. */
  append(timestamp: number, tokens: number): void {
    const previousIndex = (this.tail - 1 + this.capacity) % this.capacity;
    const previous = this.items[previousIndex];
    if (previous?.timestamp === timestamp) {
      this.items[previousIndex] = { 'timestamp': timestamp, 'tokens': previous.tokens + tokens };
      return;
    }
    this.push({ 'timestamp': timestamp, 'tokens': tokens });
  }

  /** Returns the oldest weighted admission without removing it. */
  peek(): { readonly 'timestamp': number; readonly 'tokens': number } | undefined {
    if (this.length === 0) {
      return undefined;
    }
    const result = this.items[this.head];
    return result;
  }
}
