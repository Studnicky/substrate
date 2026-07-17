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

import { HookInvocationError, HookInvoker } from '@studnicky/errors';
import { SchemaValidator } from '@studnicky/json';
import { RaceTimeout, Signal } from '@studnicky/signal';

import type { SlidingWindowLimiterOptionsInterface } from './interfaces/SlidingWindowLimiterOptionsInterface.js';

import { COUNTER_POLL_DIVISOR, MIN_RETRY_DELAY_MS } from './constants/index.js';
import { SlidingWindowLimiterOptionsEntity } from './entities/SlidingWindowLimiterOptionsEntity.js';
import { SlidingWindowLimiterConfigError } from './errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from './SlidingWindowExhaustedError.js';
import { SlidingWindowLimiterBuilder } from './SlidingWindowLimiterBuilder.js';
import { TimestampLog } from './TimestampLog.js';

/**
 * Composed `HookInvoker` for `SlidingWindowLimiter` — records a hook failure
 * into the owning `SlidingWindowLimiter`'s `hookErrors` array via a
 * constructor callback instead of throwing. Hoisted to module scope so V8
 * compiles this class once rather than per `SlidingWindowLimiter`
 * instantiation.
 */
class SlidingWindowLimiterHookInvoker extends HookInvoker {
  constructor(private readonly recordFailure: (error: HookInvocationError) => void) {
    super();
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.recordFailure(new HookInvocationError(hookName, cause));
    return undefined as T;
  }
}

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

  /**
   * Hook failures recorded by `onHookError` instead of propagated, since
   * construction. `onAllow`/`onReject`/`onWindowRoll` are fire-and-forget
   * notifications that must never affect an admission decision already
   * made — a consumer's broken hook override must not turn a successful
   * `consume()` into a thrown error, nor replace the specific
   * `SlidingWindowExhaustedError` a rejection throws with an unrelated hook
   * failure.
   */
  protected readonly hookErrors: HookInvocationError[] = [];

  /**
   * `HookInvoker`'s default `onHookError` throws a `HookInvocationError`,
   * which would leak through `consume()` in exactly the cases described by
   * `hookErrors` above, so `SlidingWindowLimiterHookInvoker` overrides it to
   * record the failure instead of throwing (mirroring the pattern `Batch`
   * and `EntityStore` use for their own fire-and-forget hooks).
   */
  protected readonly hooks: HookInvoker;

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
    this.hooks = new SlidingWindowLimiterHookInvoker((error) => { this.hookErrors.push(error); });
    const schemaOptions: SlidingWindowLimiterOptionsEntity.Type = {
      'algorithm': options.algorithm,
      'limit': options.limit,
      'windowMs': options.windowMs
    };
    if (!SlidingWindowLimiterOptionsEntity.validate(schemaOptions)) {
      const messages = SchemaValidator.formatErrors(SlidingWindowLimiterOptionsEntity.validate.errors);
      throw new SlidingWindowLimiterConfigError(messages);
    }

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
    const signal = await Signal.compose(options.signal !== undefined ? { 'signal': options.signal } : {});
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
      const outcome = await RaceTimeout.wait(waitMs, signal);
      if (outcome === 'aborted') { throw signal.reason; }
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
    if (pruned) {
      this.hooks.invoke('onWindowRoll', () => {
        const result = this.onWindowRoll();
        return result;
      });
    }

    if (timestamps.length >= this.#limit) {
      this.hooks.invoke('onReject', () => {
        const result = this.onReject(timestamps.length);
        return result;
      });
      throw new SlidingWindowExhaustedError();
    }

    timestamps.push(now);
    this.hooks.invoke('onAllow', () => {
      const result = this.onAllow(timestamps.length);
      return result;
    });
  }

  #consumeCounter(now: number): void {
    this.#rollCounterWindow(now);
    const elapsedFraction = this.#elapsedFraction(now);
    const estimateBefore = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;

    if (estimateBefore + 1 > this.#limit) {
      this.hooks.invoke('onReject', () => {
        const result = this.onReject(estimateBefore);
        return result;
      });
      throw new SlidingWindowExhaustedError();
    }

    this.#currentWindowCount += 1;
    const estimateAfter = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;
    this.hooks.invoke('onAllow', () => {
      const result = this.onAllow(estimateAfter);
      return result;
    });
  }

  #rollCounterWindow(now: number): void {
    const windowIndex = Math.floor(now / this.#windowMs);
    if (windowIndex === this.#currentWindowIndex) { return; }

    this.#previousWindowCount = windowIndex - this.#currentWindowIndex === 1 ? this.#currentWindowCount : 0;
    this.#currentWindowCount = 0;
    this.#currentWindowIndex = windowIndex;
    this.hooks.invoke('onWindowRoll', () => {
      const result = this.onWindowRoll();
      return result;
    });
  }

  #elapsedFraction(now: number): number {
    const windowStart = this.#currentWindowIndex * this.#windowMs;
    const result = (now - windowStart) / this.#windowMs;
    return result;
  }

  #nextRetryDelayMs(): number {
    const now = this.#clock();
    if (this.#algorithm === 'log') {
      const timestamps = this.#timestamps;
      if (timestamps === undefined) { throw new SlidingWindowLimiterConfigError('internal: timestamps not initialized for log algorithm'); }

      // `#nextRetryDelayMs` is only reached from `waitForToken()` after
      // `tryConsume()` has thrown `SlidingWindowExhaustedError`, which
      // `#consumeLog` only throws when `timestamps.length >= this.#limit`;
      // the schema validated in the constructor requires `limit >= 1`, so
      // `timestamps` is guaranteed non-empty here.
      const oldest = timestamps.peek();
      if (oldest === undefined) { throw new SlidingWindowLimiterConfigError('internal: timestamps unexpectedly empty in nextRetryDelayMs'); }

      const result = Math.max(MIN_RETRY_DELAY_MS, (oldest + this.#windowMs) - now);
      return result;
    }

    const untilNextWindow = ((this.#currentWindowIndex + 1) * this.#windowMs) - now;
    const result = Math.max(MIN_RETRY_DELAY_MS, Math.min(this.#windowMs / COUNTER_POLL_DIVISOR, untilNextWindow));
    return result;
  }
}
