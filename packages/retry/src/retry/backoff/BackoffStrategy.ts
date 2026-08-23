import { Guard } from '@studnicky/types';

import type { BackoffStrategyInterface } from '../../interfaces/BackoffStrategyInterface.js';

import {
  EXPONENTIAL_BASE, JITTER_BASE, LINEAR_INCREMENT
} from '../../constants/index.js';

const maximumMultiplier = 32;

/** Backoff strategy computations as static methods. */
export class BackoffStrategy {
  static constant(_attemptNumber: number, baseDelayMs: number): number {
    const result = baseDelayMs;
    return result;
  }

  static exponential(attemptNumber: number, baseDelayMs: number): number {
    const result = baseDelayMs * Math.pow(EXPONENTIAL_BASE, attemptNumber);
    return result;
  }

  static exponentialWithJitter(attemptNumber: number, baseDelayMs: number): number {
    const exponentialDelay = baseDelayMs * Math.pow(EXPONENTIAL_BASE, attemptNumber);
    const jitter = JITTER_BASE + Math.random();
    const result = Math.floor(exponentialDelay * jitter);
    return result;
  }

  static linear(attemptNumber: number, baseDelayMs: number): number {
    const result = baseDelayMs * (attemptNumber + LINEAR_INCREMENT);
    return result;
  }

  static decorrelatedJitter(attemptNumber: number, baseDelayMs: number): number {
    const maximumDelay = baseDelayMs * maximumMultiplier;
    if (attemptNumber <= 0) {
      return baseDelayMs;
    }
    const previousDelay = Math.min(maximumDelay, baseDelayMs * (3 ** attemptNumber));
    const ceiling = Math.min(maximumDelay, previousDelay * 3);
    const result = baseDelayMs + Math.random() * (ceiling - baseDelayMs);
    return result;
  }

  /** Wraps a strategy capping its output at ceilingMs. */
  static withCeiling(strategy: BackoffStrategyInterface, ceilingMs: number): BackoffStrategyInterface {
    return (attempt, base) => { const result = Math.min(ceilingMs, strategy(attempt, base)); return result; };
  }

  static isValid(value: unknown): value is BackoffStrategyInterface {
    const result = Guard.isFunction(value);
    return result;
  }
}
