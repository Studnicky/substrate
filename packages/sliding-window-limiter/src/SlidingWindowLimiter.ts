/**
 * Sliding-window rate limiter; `consume()` throws when admitting the request
 * would exceed the configured limit, `waitForToken()` blocks until admission
 * would succeed.
 *
 * Two algorithms, selected via `options.algorithm`:
 *
 * - `'log'` (exact): maintains a bounded queue of admitted request
 *   timestamps (capacity = `limit` — never more than `limit` timestamps are
 *   live at once). `consume()` prunes timestamps older than
 *   `now - windowMs` from the front, then admits only if fewer than `limit`
 *   remain.
 * - `'counter'` (approximate, O(1) space): tracks the current and previous
 *   fixed window's request counts and blends them by the elapsed fraction
 *   of the current window — `previousCount * (1 - elapsedFraction) +
 *   currentCount` — to smooth the fixed-window boundary discontinuity that
 *   a naive fixed-window counter would exhibit.
 *
 * `consume(tokens?)` and `waitForToken({ tokens? })` accept an optional
 * `tokens` parameter purely to structurally match the
 * `{ consume(tokens?): void; waitForToken(options?): Promise<void> }` shape
 * that `@studnicky/keyed-rate-limiter`'s generic rate-limiter strategy seam
 * expects (mirroring `TokenBucket`'s signature) — no import from or
 * dependency on that package is taken; this is structural typing only.
 * Sliding-window rate limiting is one-request-at-a-time by nature, so the
 * `tokens` value is accepted but ignored: every `consume()` call, regardless
 * of what is passed, is treated as exactly one admitted request.
 */

import { Signal } from '@studnicky/signal';

import type { SlidingWindowLimiterOptionsInterface } from './interfaces/SlidingWindowLimiterOptionsInterface.js';

import { SlidingWindowLimiterConfigError } from './errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from './SlidingWindowExhaustedError.js';
import { SlidingWindowLimiterBuilder } from './SlidingWindowLimiterBuilder.js';
import { TimestampLog } from './TimestampLog.js';

const MIN_RETRY_DELAY_MS = 1;
const COUNTER_POLL_DIVISOR = 10;

export class SlidingWindowLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #algorithm: 'log' | 'counter';
  readonly #clock: () => number;

  // 'log' algorithm state
  readonly #timestamps: TimestampLog | undefined;

  // 'counter' algorithm state
  #currentWindowIndex: number;
  #currentWindowCount = 0;
  #previousWindowCount = 0;

  static builder(): SlidingWindowLimiterBuilder {
    const factory = (options: SlidingWindowLimiterOptionsInterface): SlidingWindowLimiter => {
      const result = SlidingWindowLimiter.create(options);
      return result;
    };
    const result = SlidingWindowLimiterBuilder.create(factory);
    return result;
  }

  static create(options: SlidingWindowLimiterOptionsInterface): SlidingWindowLimiter {
    return new this(options);
  }

  protected constructor(options: SlidingWindowLimiterOptionsInterface) {
    if (options.limit < 1) { throw new SlidingWindowLimiterConfigError('limit must be >= 1'); }
    if (options.windowMs <= 0) { throw new SlidingWindowLimiterConfigError('windowMs must be > 0'); }

    this.#limit = options.limit;
    this.#windowMs = options.windowMs;
    this.#algorithm = options.algorithm;
    this.#clock = options.clock ?? (() => { const result = Date.now(); return result; });
    this.#timestamps = this.#algorithm === 'log' ? TimestampLog.make(this.#limit) : undefined;
    this.#currentWindowIndex = Math.floor(this.#clock() / this.#windowMs);
  }

  /**
   * Admits one request, or throws `SlidingWindowExhaustedError` if admitting
   * it would exceed `limit`. `tokens` is accepted for structural
   * compatibility with the keyed-rate-limiter strategy seam but otherwise
   * ignored — see the class-level doc comment.
   */
  consume(_tokens?: number): void {
    const now = this.#clock();
    if (this.#algorithm === 'log') {
      this.#consumeLog(now);
    } else {
      this.#consumeCounter(now);
    }
  }

  /** Wait until `consume()` would succeed, then consume. */
  async waitForToken(options: { 'signal'?: AbortSignal; 'tokens'?: number } = {}): Promise<void> {
    const signal = Signal.compose(options.signal !== undefined ? { 'signal': options.signal } : {});
    const tryConsume = (tokens?: number): boolean => {
      try {
        this.consume(tokens);
        return true;
      } catch (error) {
        if (!(error instanceof SlidingWindowExhaustedError)) { throw error; }
        return false;
      }
    };
    while (true) {
      if (tryConsume(options.tokens)) {
        return;
      }
      const waitMs = this.#nextRetryDelayMs();
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) { reject(signal.reason); return; }
        const timer = setTimeout(resolve, waitMs);
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { 'once': true });
      });
    }
  }

  /**
   * Fires when a request is admitted, with the window's current effective
   * count (post-admission). Must not throw or block.
   */
  protected onAllow(_count: number): void {}

  /**
   * Fires when a request would exceed `limit`, before throwing. Carries the
   * effective count that caused the rejection (pre-admission). Must not
   * throw or block.
   */
  protected onReject(_count: number): void {}

  /**
   * Fires when the window boundary advances: for `'log'`, when pruning
   * removes at least one stale timestamp; for `'counter'`, when the fixed
   * window index changes. Must not throw or block.
   */
  protected onWindowRoll(): void {}

  #consumeLog(now: number): void {
    const timestamps = this.#timestamps;
    if (timestamps === undefined) { throw new SlidingWindowLimiterConfigError('internal: timestamps not initialized for log algorithm'); }

    const cutoff = now - this.#windowMs;
    let pruned = false;
    let oldest = timestamps.peek();
    while (oldest !== undefined && oldest <= cutoff) {
      timestamps.shift();
      pruned = true;
      oldest = timestamps.peek();
    }
    if (pruned) { this.onWindowRoll(); }

    if (timestamps.length >= this.#limit) {
      this.onReject(timestamps.length);
      throw new SlidingWindowExhaustedError();
    }

    timestamps.push(now);
    this.onAllow(timestamps.length);
  }

  #consumeCounter(now: number): void {
    this.#rollCounterWindow(now);
    const elapsedFraction = this.#elapsedFraction(now);
    const estimateBefore = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;

    if (estimateBefore + 1 > this.#limit) {
      this.onReject(estimateBefore);
      throw new SlidingWindowExhaustedError();
    }

    this.#currentWindowCount += 1;
    const estimateAfter = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;
    this.onAllow(estimateAfter);
  }

  #rollCounterWindow(now: number): void {
    const windowIndex = Math.floor(now / this.#windowMs);
    if (windowIndex === this.#currentWindowIndex) { return; }

    this.#previousWindowCount = windowIndex - this.#currentWindowIndex === 1 ? this.#currentWindowCount : 0;
    this.#currentWindowCount = 0;
    this.#currentWindowIndex = windowIndex;
    this.onWindowRoll();
  }

  #elapsedFraction(now: number): number {
    const windowStart = this.#currentWindowIndex * this.#windowMs;
    const result = (now - windowStart) / this.#windowMs;
    return result;
  }

  #nextRetryDelayMs(): number {
    const now = this.#clock();
    if (this.#algorithm === 'log') {
      const oldest = this.#timestamps?.peek();
      if (oldest === undefined) { return this.#windowMs; }
      const result = Math.max(MIN_RETRY_DELAY_MS, (oldest + this.#windowMs) - now);
      return result;
    }

    const untilNextWindow = ((this.#currentWindowIndex + 1) * this.#windowMs) - now;
    const result = Math.max(MIN_RETRY_DELAY_MS, Math.min(this.#windowMs / COUNTER_POLL_DIVISOR, untilNextWindow));
    return result;
  }
}
