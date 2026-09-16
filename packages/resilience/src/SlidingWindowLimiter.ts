/**
 * Rate-limits positive numeric token units in an exact rolling window or an
 * approximate blended fixed window. `consume()` rejects requests that do not
 * fit, while `waitForToken()` waits only for requests that can fit.
 *
 * The `log` algorithm retains weighted admissions until their rolling-window
 * expiry and coalesces units recorded at the same timestamp. The `counter`
 * algorithm retains current and prior window totals in constant space.
 * Successful operations return the canonical consumption result.
 */
import { SchemaIntakeError } from '@studnicky/entity/node';
import { type HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { RaceTimeout, Signal } from '@studnicky/signal/node';
import { Predicates } from '@studnicky/types/node';

import type { RateLimitConsumptionEntity } from './entities/RateLimitConsumptionEntity.js';
import type { SlidingWindowLimiterOptionsInterface } from './interfaces/SlidingWindowLimiterOptionsInterface.js';

import { COUNTER_POLL_DIVISOR, MINIMUM_RETRY_DELAY_MS } from './constants/index.js';
import { SlidingWindowLimiterOptionsEntity } from './entities/SlidingWindowLimiterOptionsEntity.js';
import { SlidingWindowLimiterConfigError } from './errors/SlidingWindowLimiterConfigError.js';
import { RateLimiterClock } from './RateLimiterClock.js';
import { SlidingWindowExhaustedError } from './SlidingWindowExhaustedError.js';
import { TimestampLog } from './TimestampLog.js';

class SlidingWindowHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}

interface SlidingWindowLimiterSubclassInterface<TInstance extends SlidingWindowLimiter> extends Function {
  readonly 'prototype': TInstance;
}

export class SlidingWindowLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #algorithm: 'log' | 'counter';
  readonly #clock: () => number;
  readonly #signal: Signal;

  // 'log' algorithm state
  readonly #timestamps: TimestampLog | undefined;
  #logTokenCount = 0;

  // 'counter' algorithm state
  #currentWindowIndex: number;
  #currentWindowCount = 0;
  #previousWindowCount = 0;

  /**
   * Invokes fire-and-forget notification hooks without allowing a broken
   * override to replace an admission decision or its specific rejection.
   */
  protected readonly hooks = new SlidingWindowHookInvoker();

  static create<TInstance extends SlidingWindowLimiter = SlidingWindowLimiter>(
    this: SlidingWindowLimiterSubclassInterface<TInstance>,
    options: SlidingWindowLimiterOptionsInterface
  ): TInstance {
    const result: unknown = Reflect.construct(this, [options]);
    if (!Predicates.isObjectLike(result) || !Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('SlidingWindowLimiter.create() must construct a SlidingWindowLimiter instance');
    }
    return result;
  }

  protected constructor(options: SlidingWindowLimiterOptionsInterface) {
    const { clock = Date.now, ...serializableOptions } = options;
    let schemaOptions: SlidingWindowLimiterOptionsEntity.Type;
    try {
      schemaOptions = SlidingWindowLimiterOptionsEntity.intake(serializableOptions);
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw new SlidingWindowLimiterConfigError(error.message);
      }
      throw error;
    }

    this.#limit = schemaOptions.limit;
    this.#windowMs = schemaOptions.windowMs;
    this.#algorithm = schemaOptions.algorithm;
    this.#clock = RateLimiterClock.create(clock);
    this.#signal = Signal.create();
    this.#timestamps = this.#algorithm === 'log'
      ? TimestampLog.create<{ readonly 'timestamp': number; readonly 'tokens': number }, TimestampLog>({ 'capacity': this.#limit, 'overflow': 'grow' })
      : undefined;
    this.#currentWindowIndex = Math.floor(this.#clock() / this.#windowMs);
  }

  /** Count of hook failures recorded by the safe invocation boundary. */
  protected get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  /** Returns a defensive snapshot of failures recorded by notification hooks. */
  protected getHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }

  /**
   * Admits positive numeric token units, or throws `SlidingWindowExhaustedError`
   * if admitting them would exceed `limit`.
   */
  consume(tokens?: number): RateLimitConsumptionEntity.Type {
    const requestedTokens = this.#resolveTokens(tokens);
    const now = this.#clock();
    if (this.#algorithm === 'log') {
      const result = this.#consumeLog(now, requestedTokens);
      return result;
    }
    const result = this.#consumeCounter(now, requestedTokens);
    return result;
  }

  /** Wait until the requested token units can be admitted, then consume them. */
  async waitForToken(
    options: { 'signal'?: AbortSignal; 'tokens'?: number } = {}
  ): Promise<RateLimitConsumptionEntity.Type> {
    const tokens = this.#resolveTokens(options.tokens);
    const signal = await this.#signal.compose(options.signal !== undefined ? { 'signal': options.signal } : {});
    if (tokens > this.#limit) {
      const result = this.consume(tokens);
      return result;
    }
    while (true) {
      const consumption = this.#consumeIfAvailable(tokens);
      if (consumption !== undefined) {
        return consumption;
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

  #resolveTokens(tokens?: number): number {
    const result = tokens ?? 1;
    if (!Number.isFinite(result) || result <= 0) {
      throw new SlidingWindowLimiterConfigError('tokens must be a positive number');
    }
    return result;
  }

  #consumeIfAvailable(tokens: number): RateLimitConsumptionEntity.Type | undefined {
    try {
      const result = this.consume(tokens);
      return result;
    } catch (error) {
      if (!(error instanceof SlidingWindowExhaustedError)) { throw error; }
      return undefined;
    }
  }

  #consumeLog(now: number, tokens: number): RateLimitConsumptionEntity.Type {
    const timestamps = this.#timestamps;
    if (timestamps === undefined) { throw new SlidingWindowLimiterConfigError('internal: timestamps not initialized for log algorithm'); }

    const cutoff = now - this.#windowMs;
    let pruned = false;
    let oldest = timestamps.peek();
    while (oldest !== undefined && oldest.timestamp <= cutoff) {
      const expired = timestamps.shift();
      if (expired !== undefined) {
        this.#logTokenCount -= expired.tokens;
      }
      pruned = true;
      oldest = timestamps.peek();
    }
    if (pruned) {
      this.hooks.invoke('onWindowRoll', () => {
        const result = this.onWindowRoll();
        return result;
      });
    }

    if (this.#logTokenCount + tokens > this.#limit) {
      this.hooks.invoke('onReject', () => {
        const result = this.onReject(this.#logTokenCount);
        return result;
      });
      throw new SlidingWindowExhaustedError();
    }

    timestamps.append(now, tokens);
    this.#logTokenCount += tokens;
    this.hooks.invoke('onAllow', () => {
      const result = this.onAllow(this.#logTokenCount);
      return result;
    });
    return {
      'consumedTokens': tokens,
      'remainingTokens': this.#limit - this.#logTokenCount
    };
  }

  #consumeCounter(now: number, tokens: number): RateLimitConsumptionEntity.Type {
    this.#rollCounterWindow(now);
    const elapsedFraction = this.#elapsedFraction(now);
    const estimateBefore = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;

    if (estimateBefore + tokens > this.#limit) {
      this.hooks.invoke('onReject', () => {
        const result = this.onReject(estimateBefore);
        return result;
      });
      throw new SlidingWindowExhaustedError();
    }

    this.#currentWindowCount += tokens;
    const estimateAfter = (this.#previousWindowCount * (1 - elapsedFraction)) + this.#currentWindowCount;
    this.hooks.invoke('onAllow', () => {
      const result = this.onAllow(estimateAfter);
      return result;
    });
    return {
      'consumedTokens': tokens,
      'remainingTokens': Math.max(0, this.#limit - estimateAfter)
    };
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

      // `#nextRetryDelayMs` is reached after an exhausted admission. The log
      // contains at least one admitted timestamp because the requested units
      // fit within the validated positive limit.
      const oldest = timestamps.peek();
      if (oldest === undefined) { throw new SlidingWindowLimiterConfigError('internal: timestamps unexpectedly empty in nextRetryDelayMs'); }

      const result = Math.max(MINIMUM_RETRY_DELAY_MS, (oldest.timestamp + this.#windowMs) - now);
      return result;
    }

    const untilNextWindow = ((this.#currentWindowIndex + 1) * this.#windowMs) - now;
    const result = Math.max(MINIMUM_RETRY_DELAY_MS, Math.min(this.#windowMs / COUNTER_POLL_DIVISOR, untilNextWindow));
    return result;
  }
}
