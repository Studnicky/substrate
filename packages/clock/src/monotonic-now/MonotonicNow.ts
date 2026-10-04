import { Predicates } from '@studnicky/types/browser';

import type { MonotonicNowInterface } from './interfaces/MonotonicNowInterface.js';

import { ClockError } from '../errors/ClockError.js';

/** Validates a narrow millisecond source before monotonic arithmetic consumes its readings. */
export class MonotonicNow {
  static create(candidate: unknown): MonotonicNowInterface {
    if (!Predicates.isFunction(candidate)) {
      throw new ClockError('clock must be a function');
    }

    let previousReading: number | undefined;

    return (): number => {
      let reading: unknown;
      try {
        reading = candidate();
      } catch (error) {
        throw new ClockError('clock must not throw', error);
      }
      if (!Predicates.isFiniteNumber(reading)) {
        throw new ClockError('clock must return a finite number');
      }
      if (previousReading !== undefined && reading < previousReading) {
        throw new ClockError('clock readings must be nondecreasing');
      }
      previousReading = reading;
      return reading;
    };
  }
}
