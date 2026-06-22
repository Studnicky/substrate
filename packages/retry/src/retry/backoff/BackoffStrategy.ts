import { TypeGuards } from '@studnicky/config';

import type { BackoffStrategyType } from '../../types/BackoffStrategyType.js';

import {
  EXPONENTIAL_BASE, JITTER_BASE, LINEAR_INCREMENT
} from '../../constants/index.js';

const maxMultiplier = 32;

/** Backoff strategy computations as static methods. */
export class BackoffStrategy {
  static constant(_attemptNumber: number, baseDelayMs: number): number {
    return baseDelayMs;
  }

  static exponential(attemptNumber: number, baseDelayMs: number): number {
    return baseDelayMs * Math.pow(EXPONENTIAL_BASE, attemptNumber);
  }

  static exponentialWithJitter(attemptNumber: number, baseDelayMs: number): number {
    const exponentialDelay = baseDelayMs * Math.pow(EXPONENTIAL_BASE, attemptNumber);
    const jitter = JITTER_BASE + Math.random();
    return Math.floor(exponentialDelay * jitter);
  }

  static linear(attemptNumber: number, baseDelayMs: number): number {
    return baseDelayMs * (attemptNumber + LINEAR_INCREMENT);
  }

  static decorrelatedJitter(attemptNumber: number, baseDelayMs: number): number {
    const maxDelay = baseDelayMs * maxMultiplier;
    if (attemptNumber <= 0) {
      return baseDelayMs;
    }
    const prevDelay = Math.min(maxDelay, baseDelayMs * (3 ** attemptNumber));
    const ceiling = Math.min(maxDelay, prevDelay * 3);
    return baseDelayMs + Math.random() * (ceiling - baseDelayMs);
  }

  /** Wraps a strategy capping its output at ceilingMs. */
  static withCeiling(strategy: BackoffStrategyType, ceilingMs: number): BackoffStrategyType {
    return (attempt, base) => Math.min(ceilingMs, strategy(attempt, base));
  }

  static isValid(value: unknown): value is BackoffStrategyType {
    return TypeGuards.isFunction(value);
  }
}
