import { Predicates } from '@studnicky/types/node';

import type { RateLimiterClockInterface } from './interfaces/RateLimiterClockInterface.js';

import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

/** Validates runtime clock collaborators before rate-limit operations consume their readings. */
export class RateLimiterClock {
  static create(candidate: unknown): RateLimiterClockInterface {
    if (!Predicates.isFunction(candidate)) {
      throw new ResilienceConfigError('clock must be a function');
    }

    let previousReading: number | undefined;

    return (): number => {
      let reading: unknown;
      try {
        reading = candidate();
      } catch {
        throw new ResilienceConfigError('clock must not throw');
      }

      if (!Predicates.isFiniteNumber(reading)) {
        throw new ResilienceConfigError('clock must return a finite number');
      }
      if (previousReading !== undefined && reading < previousReading) {
        throw new ResilienceConfigError('clock readings must be nondecreasing');
      }

      previousReading = reading;
      return reading;
    };
  }
}
