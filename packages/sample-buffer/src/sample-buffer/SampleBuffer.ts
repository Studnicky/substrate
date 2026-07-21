/**
 * Fixed-capacity circular buffer for numeric samples with percentile calculation
 */

import { HookInvoker } from '@studnicky/errors';

import type { SampleBufferInterface } from '../interfaces/SampleBufferInterface.js';

import {
  EMPTY_LENGTH,
  FIRST_ARRAY_INDEX,
  INCREMENT_BY_ONE,
  INITIAL_BUFFER_COUNT,
  INITIAL_BUFFER_HEAD,
  LAST_ARRAY_INDEX,
  PERCENTILE_MAX
} from '../constants/index.js';
import { SampleBufferOptionsEntity } from '../entities/SampleBufferOptionsEntity.js';
import { SampleBufferError } from '../errors/index.js';

/**
 * Fixed-capacity circular buffer for numeric samples
 *
 * Stores a sliding window of numeric measurements and calculates
 * percentiles using linear interpolation. The buffer overwrites
 * the oldest samples when full.
 *
 * Subclasses may override the protected hook methods to observe lifecycle
 * events. All hooks have no-op defaults — super() call is not required
 * unless the subclass needs base behavior.
 *
 * Fire points:
 * - `onOverflow(value)` — start of full-buffer push path, before eviction
 * - `onEvict(oldValue)` — before overwrite in the full-buffer push path
 * - `onPush(value, evicted)` — end of push(), after length/head updated
 * - `onComputeStart(length)` — start of buildSortedSamples(), before sort
 * - `onComputeComplete(length, sorted)` — end of buildSortedSamples(), after sort
 * - `onClear()` — start of clear(), before state is reset
 * - `onPercentile(pct, result)` — before returning from percentile()
 *
 * @example Basic usage
 * ```typescript
 * const buffer = SampleBuffer.create({ capacity: 100 });
 *
 * // Add samples
 * for (let i = 0; i < 100; i++) {
 *   buffer.push(Math.random() * 200);
 * }
 *
 * // Get percentiles
 * console.log(`p50: ${buffer.percentile(50)}`);
 * console.log(`p95: ${buffer.percentile(95)}`);
 * console.log(`p99: ${buffer.percentile(99)}`);
 * ```
 */
export class SampleBuffer implements SampleBufferInterface {
  static create(options: SampleBufferOptionsEntity.Type): SampleBuffer {
    return new this(options);
  }

  static #validate(options: SampleBufferOptionsEntity.Type): void {
    if (!SampleBufferOptionsEntity.validate(options)) {
      const errors = SampleBufferOptionsEntity.validate.errors ?? [];
      const parts = errors.map((e) => {
        const part = `${e.instancePath} ${e.message}`.trim();
        return part;
      });
      const message = parts.join('; ');
      throw new SampleBufferError(message.length > 0 ? message : 'invalid options');
    }
    // Domain invariant: capacity must be a positive integer (schema enforces minimum:1 and type:integer)
  }

  protected count = INITIAL_BUFFER_COUNT;
  protected capacity: number;
  protected head = INITIAL_BUFFER_HEAD;
  #samples: number[];
  protected sortedCache: null | number[] = null;
  protected readonly hooks: HookInvoker = new HookInvoker();

  /**
   * Create a new sample buffer
   *
   * @param options - Construction options including capacity
   */
  protected constructor(options: SampleBufferOptionsEntity.Type) {
    SampleBuffer.#validate(options);
    this.capacity = options.capacity;
    this.#samples = Array.from<number>({ 'length': options.capacity });
  }

  /**
   * Clear all samples from the buffer.
   * Fire point: `onClear` is called at the start, before state is reset.
   */
  clear(): void {
    this.hooks.invoke('onClear', () => {
      const result = this.onClear();
      return result;
    });
    this.count = INITIAL_BUFFER_COUNT;
    this.head = INITIAL_BUFFER_HEAD;
    this.sortedCache = null;
  }

  /**
   * Get samples in window order, then sort them ascending.
   * Called internally by percentile(); subclasses may override to
   * customize the sort or sample extraction.
   */
  protected buildSortedSamples(): number[] {
    this.hooks.invoke('onComputeStart', () => {
      const result = this.onComputeStart(this.count);
      return result;
    });

    const length = this.count;
    const capacity = this.capacity;
    const head = this.head;
    const samples = this.#samples;
    const result: number[] = Array.from<number>({ 'length': length });

    for (let i = FIRST_ARRAY_INDEX; i < length; i++) {
      const index = length < capacity
        ? i
        : (head + i) % capacity;

      result[i] = samples[index]!;
    }

    result.sort((left, right) => {
      return left - right;
    });
    this.hooks.invoke('onComputeComplete', () => {
      const hookResult = this.onComputeComplete(length, result);
      return hookResult;
    });
    return result;
  }

  /**
   * Whether the buffer has reached capacity
   */
  get isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Number of samples in the buffer
   *
   * Getter required: count is mutated internally but exposed read-only
   */
  get length(): number {
    return this.count;
  }

  /**
   * Called at the start of clear(), before state is reset.
   * No-op default — override to observe buffer clears.
   */
  protected onClear(): void {
    // no-op
  }

  /**
   * Called in the full-buffer push path, immediately before the oldest
   * sample is overwritten. Not called when the buffer is not full.
   * No-op default — override to observe evictions.
   *
   * @param _oldValue - The sample value that will be overwritten
   */
  protected onEvict(_oldValue: number): void {
    // no-op
  }

  /**
   * Called at the start of the full-buffer push path, before any eviction.
   * Receives the incoming sample value that triggered the overflow.
   * No-op default — override to observe buffer overflow events.
   *
   * @param _value - The incoming sample value that caused the overflow
   */
  protected onOverflow(_value: number): void {}

  /**
   * Called at the end of push(), after the sample has been stored and
   * length/head updated.
   * No-op default — override to observe pushes.
   *
   * @param _value - The sample value that was pushed
   * @param _evicted - Whether an existing sample was evicted (buffer was full)
   */
  protected onPush(_value: number, _evicted: boolean): void {
    // no-op
  }

  /**
   * Called immediately before returning from percentile(), after the
   * result has been calculated.
   * Not called when the buffer is empty (undefined return path).
   * No-op default — override to observe percentile calculations.
   *
   * @param _pct - The percentile requested (0-100)
   * @param _result - The calculated result value
   */
  protected onPercentile(_pct: number, _result: number): void {
    // no-op
  }

  /**
   * Called at the start of buildSortedSamples(), before sorting.
   * Fires on a cache miss in percentile() — indicates a sort is about to run.
   * No-op default — override to observe sort/compute start events.
   *
   * @param _length - Number of samples about to be sorted
   */
  protected onComputeStart(_length: number): void {}

  /**
   * Called at the end of buildSortedSamples(), after sorting is complete.
   * Fires on a cache miss in percentile() — the result is the freshly sorted array.
   * No-op default — override to observe sort/compute completion.
   *
   * @param _length - Number of samples that were sorted
   * @param _sorted - The sorted sample array (do not mutate)
   */
  protected onComputeComplete(_length: number, _sorted: readonly number[]): void {}

  /**
   * Calculate a percentile from the buffered samples using linear interpolation
   *
   * @param pct - Percentile to calculate (0-100)
   * @returns Percentile value or undefined if buffer is empty
   */
  percentile(pct: number): number | undefined {
    if (this.count === EMPTY_LENGTH) {
      return undefined;
    }

    this.sortedCache ??= this.buildSortedSamples();

    const sorted = this.sortedCache;

    let result: number;

    // Handle edge cases
    if (pct <= EMPTY_LENGTH) {
      result = sorted[FIRST_ARRAY_INDEX]!;
      this.hooks.invoke('onPercentile', () => {
        const hookResult = this.onPercentile(pct, result);
        return hookResult;
      });
      return result;
    }
    if (pct >= PERCENTILE_MAX) {
      result = sorted.at(LAST_ARRAY_INDEX)!;
      this.hooks.invoke('onPercentile', () => {
        const hookResult = this.onPercentile(pct, result);
        return hookResult;
      });
      return result;
    }

    // Linear interpolation for percentile
    const rank = (pct / PERCENTILE_MAX) * (sorted.length - INCREMENT_BY_ONE);
    const lowerIndex = Math.floor(rank);
    const upperIndex = Math.ceil(rank);

    if (lowerIndex === upperIndex) {
      result = sorted[lowerIndex]!;
      this.hooks.invoke('onPercentile', () => {
        const hookResult = this.onPercentile(pct, result);
        return hookResult;
      });
      return result;
    }

    const fraction = rank - lowerIndex;
    const lowerValue = sorted[lowerIndex]!;
    const upperValue = sorted[upperIndex]!;

    result = lowerValue + fraction * (upperValue - lowerValue);
    this.hooks.invoke('onPercentile', () => {
      const hookResult = this.onPercentile(pct, result);
      return hookResult;
    });
    return result;
  }

  /**
   * Add a numeric sample to the buffer
   *
   * If the buffer is full, the oldest sample is overwritten.
   * Fire point: `onEvict` fires before overwrite; `onPush` fires at end.
   *
   * @param value - Sample value
   */
  push(value: number): void {
    // Invalidate sorted cache
    this.sortedCache = null;

    if (this.count < this.capacity) {
      // Buffer not full - append
      this.#samples[this.count] = value;
      this.count++;
      this.hooks.invoke('onPush', () => {
        const result = this.onPush(value, false);
        return result;
      });
    } else {
      // Buffer full - overwrite oldest (at head position)
      this.hooks.invoke('onOverflow', () => {
        const result = this.onOverflow(value);
        return result;
      });
      const oldValue = this.#samples[this.head]!;
      this.hooks.invoke('onEvict', () => {
        const result = this.onEvict(oldValue);
        return result;
      });
      this.#samples[this.head] = value;
      this.head = (this.head + INCREMENT_BY_ONE) % this.capacity;
      this.hooks.invoke('onPush', () => {
        const result = this.onPush(value, true);
        return result;
      });
    }
  }
}
